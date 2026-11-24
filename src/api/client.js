/**
 * HTTP 请求：公共请求头与 callAPI（重试、签名、csrf、错误处理）
 */

import { runtime } from '../runtime.js';
import { USER_AGENT } from '../constants.js';
import { JSONParse } from '../utils/json.js';
import { wait } from '../utils/misc.js';
import { logError } from '../utils/log.js';
import { appSign, encodeWbi } from './sign.js';

export const headers = new Headers({ Origin: 'https://www.bilibili.com', Referer: 'https://www.bilibili.com/', 'User-Agent': USER_AGENT }); // HTTP 标头（initialize() 时会加入登录 Cookie）

export const callAPI = async (url, options = {}) => { // 调用 API
  const initialUrlObj = new URL(url),
        method = typeof options.method === 'string' ? options.method.toUpperCase() : 'GET',
        APIHeaders = new Headers(headers),
        requiredKeys = options.requiredKeys ?? (method === 'GET' ? ['code', 'data'] : ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) ? ['code'] : []); // 在回应的 JSON 中必须含有的键
  let retries = options.retries === true ? 3 : options.retries === false ? 1
    : options.retries ?? (['GET', 'HEAD', 'OPTIONS'].includes(method) ? 3 : 1); // 重试次数

  if (options.params) { // 请求参数
    for (const [name, value] of Object.entries(options.params)) {
      initialUrlObj.searchParams.set(name, value);
    }
  }
  if (options.headers) { // 请求标头
    for (const [name, value] of Object.entries(options.headers)) {
      APIHeaders.set(name, value);
    }
  }
  if (options.signal instanceof AbortSignal) retries = 1;

  if (options.includePlatformInfo) { // 包含平台标识信息
    initialUrlObj.searchParams.set('build', '0');
    initialUrlObj.searchParams.set('mobi_app', 'web');
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && (options.body instanceof URLSearchParams || options.body instanceof FormData)) {
      options.body.set('build', '0');
      options.body.set('mobi_app', 'web');
    }
  }
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) { // 请求使用的是修改方法，就添加 csrf
    initialUrlObj.searchParams.set('csrf_token', runtime.config.AccountInfo.csrfToken);
    initialUrlObj.searchParams.set('csrf', runtime.config.AccountInfo.csrfToken);
    if (options.body instanceof URLSearchParams || options.body instanceof FormData) {
      options.body.set('csrf_token', runtime.config.AccountInfo.csrfToken);
      options.body.set('csrf', runtime.config.AccountInfo.csrfToken);
    }
  }

  for (let i = 1; i <= retries; i++) { // 多次尝试请求，若请求失败，则再次请求
    const urlObj = new URL(initialUrlObj);

    if (options.appSign) { // 使用 APP 签名
      urlObj.search = appSign(urlObj.search);
    }
    if (options.wbiSign) { // 使用 Wbi 签名
      urlObj.searchParams.set('gaia_source', 'main_web');
      if (!urlObj.searchParams.has('platform')) urlObj.searchParams.set('platform', 'web');
      urlObj.search = encodeWbi(urlObj.search);
    }

    try {
      const signals = [AbortSignal.timeout(10000)];
      if (options.signal instanceof AbortSignal) signals.push(options.signal);

      const resp = await fetch(urlObj, { method, headers: APIHeaders, body: options.body, keepalive: true, signal: AbortSignal.any(signals) });
      if (!resp.ok) throw new TypeError(`HTTP status: ${resp.status}`); // 服务器返回了表示错误的 HTTP 状态码

      const json = JSONParse(await resp.text());
      if ([-351, -352, -401, -412, -509, -799].includes(json.code)) throw new TypeError(`Response code: ${json.code}`); // 请求被拦截
      const notIncludedKeys = requiredKeys.filter(k => !Object.hasOwn(json, k));
      if (json.code === 0 && notIncludedKeys.length) { // 回应的 JSON 中缺少必须含有的键
        throw new TypeError(`Response does not contain required keys: ${notIncludedKeys.join(', ')}`);
      }

      return json;
    } catch (e) {
      logError(`#${i} ${method} ${urlObj.href} 出错：`, { message: e.message });

      if (i < retries) { // 请求次数小于尝试次数，就在 1 秒后再次尝试请求
        await wait(1000);
      } else { // 请求次数已经达到了尝试次数，就结束请求
        if (e instanceof DOMException && e.name === 'TimeoutError') {
          return { code: -8888, message: '接口超时，稍后再试试吧~ (ಥ﹏ಥ)', ttl: 1, data: null };
        } else {
          return { code: -8888, message: '对不起，服务器开小差了~ (ಥ﹏ಥ)', ttl: 1, data: null };
        }
      }
    }
  }
};
