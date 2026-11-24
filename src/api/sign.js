/**
 * 请求签名：APP 签名与 Wbi 签名
 */

import querystring from 'node:querystring';
import md5 from 'md5';
import { runtime, getCurrentTime } from '../runtime.js';

export const appSign = (query, appKey = '1d8b6e7d45233436', appSec = '560c52ccd288fed045859ed18bffd973') => { // 对请求参数进行 APP 签名，改编自 https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/sign/APP.md
  const params = Object.entries(querystring.parse(query.startsWith('?') ? query.slice(1) : query));
  params.push(['appkey', appKey]);
  params.sort(([aKey], [bKey]) => aKey > bKey ? 1 : aKey < bKey ? -1 : 0); // 按照键名排序参数
  params.push(['sign', md5(querystring.stringify(Object.fromEntries(params)) + appSec)]); // 计算签名
  return querystring.stringify(Object.fromEntries(params));
};
export const encodeWbi = query => { // 对请求参数进行 Wbi 签名，改编自 https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/sign/wbi.md
  const { AccountInfo: { wbiKeys } } = runtime.config;
  const mixinKey = [46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52]
          .reduce((accumulator, n) => accumulator + (wbiKeys.imgKey + wbiKeys.subKey)[n], '').slice(0, 32), // 对 imgKey 和 subKey 进行字符顺序打乱编码
        params = Object.entries(querystring.parse(query.startsWith('?') ? query.slice(1) : query));
  params.push(['wts', Math.floor(getCurrentTime() / 1000)]); // 添加 wts 字段
  params.push(['w_rid', md5(querystring.stringify(Object.fromEntries(params.toSorted(([aKey], [bKey]) => aKey > bKey ? 1 : aKey < bKey ? -1 : 0))) + mixinKey)]); // 按照键名排序参数，计算 w_rid
  return querystring.stringify(Object.fromEntries(params));
};
