/**
 * 与服务器同步：时间差与 Wbi 密钥
 */

import { runtime } from '../runtime.js';
import { logError } from '../utils/log.js';
import { callAPI } from './client.js';

export const updateTimeDifference = async () => { // 更新本机与服务器的时间差
  const njson = await callAPI('https://api.bilibili.com/x/click-interface/click/now');
  const clientCurrentTime = Date.now();
  if (njson.code === 0) {
    runtime.timeDifference = clientCurrentTime - njson.data.now * 1000;
  }
  return runtime.timeDifference;
};
export const updateWbiKeys = async () => { // 更新最新的 Wbi 密钥，改编自 https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/sign/wbi.md
  const ujson = await callAPI('https://api.bilibili.com/x/web-interface/nav'); // 从获取登录信息接口获取 img_key 与 sub_key
  if (ujson.code === 0) {
    runtime.config.AccountInfo.wbiKeys = {
      imgKey: /.*\/(?<key>[^.]+)\.?/.exec(ujson.data.wbi_img.img_url)?.groups?.key || '7cd084941338484aae1ad9425b84077c',
      subKey: /.*\/(?<key>[^.]+)\.?/.exec(ujson.data.wbi_img.sub_url)?.groups?.key || '4932caff0ff746eab6f01bf08b70ac45',
    };
  } else {
    logError('更新 Wbi 密钥时出错：', ujson);
  }
  return runtime.config.AccountInfo.wbiKeys;
};
