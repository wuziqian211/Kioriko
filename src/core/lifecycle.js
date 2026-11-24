/**
 * 生命周期：登录、启动计时器（轮询消息、校时、更新 Wbi 密钥）与撤销初始化
 */

import crypto from 'node:crypto';
import OpenAI from 'openai'; // OpenAI SDK
import { runtime, timerList, callbackFns, officialUids, getCurrentTime } from '../runtime.js';
import { style } from '../utils/color.js';
import { logError } from '../utils/log.js';
import { loadConfig, saveConfig } from './config.js';
import { fetchMessages } from './poller.js';
import { headers, callAPI } from '../api/client.js';
import { updateTimeDifference, updateWbiKeys } from '../api/sync.js';
import { getBilibiliUid, getOfficialUids } from '../api/user.js';

export const initialize = async () => { // 初始化
  const tempConfig = await loadConfig();
  const { AccountInfo: { sessionData, csrfToken }, Timeout } = tempConfig;

  const ujson = await callAPI('https://api.bilibili.com/x/web-interface/nav',
    { headers: { Cookie: `SESSDATA=${sessionData}; bili_jct=${csrfToken}` } }); // 获取自己的用户信息
  if (ujson.code !== 0) {
    logError('获取登录信息时出错：', ujson, '，请重新尝试登录');
    return false;
  }

  uninitialize(); // 清除以前的初始化信息
  runtime.config = tempConfig;
  headers.set('Cookie', `SESSDATA=${sessionData}; bili_jct=${csrfToken}; DedeUserID=${ujson.data.mid}`);
  runtime.config.AccountInfo.mid = ujson.data.mid;
  if (!runtime.config.AccountInfo.deviceId) runtime.config.AccountInfo.deviceId = crypto.randomUUID();
  runtime.config.AccountInfo.wbiKeys = {
    imgKey: /.*\/(?<key>[^.]+)\.?/.exec(ujson.data.wbi_img.img_url)?.groups?.key || '7cd084941338484aae1ad9425b84077c',
    subKey: /.*\/(?<key>[^.]+)\.?/.exec(ujson.data.wbi_img.sub_url)?.groups?.key || '4932caff0ff746eab6f01bf08b70ac45',
  };
  saveConfig();

  runtime.aiClient = new OpenAI({
    baseURL: runtime.config.AiInfo.baseUrl,
    apiKey: runtime.config.AiInfo.apiKey,
    maxRetries: 3,
  });

  console.log(`欢迎 ${style('magentaBright', ujson.data.uname)} 使用 ${style('cyanBright', 'Kioriko')}！`);

  await Promise.all([
    (async () => { // 更新时间差，开始获取新消息
      await updateTimeDifference();
      runtime.startRunningTime = getCurrentTime(); // 获取开始运行时间
      runtime.lastTime = runtime.startRunningTime; // 将上次获取消息时间设置为开始运行时间
      timerList.push(
        setInterval(fetchMessages, Timeout), // 每 Timeout 毫秒获取一次最新消息
        setInterval(updateTimeDifference, 3600000), // 每 1 小时更新一次时间差
        setInterval(updateWbiKeys, 3600000), // 每 1 小时更新一次 Wbi 密钥
      );
    })(),
    (async () => { // 获取官方账号的 UID
      officialUids.length = 0; // 清空数组
      officialUids.push(...new Set((await Promise.all([getBilibiliUid(), getOfficialUids()])).flat()));
    })(),
  ]);

  return true;
};
export const uninitialize = (clearLoginInfo = true) => { // 撤销初始化
  timerList.forEach(t => { clearInterval(t); }); // 清空计时器
  timerList.length = 0;
  callbackFns.filter(({ state: { type } }) => type === 'autoReplyWaiting')
    .forEach(({ state: { timeoutTimer } }) => { clearTimeout(timeoutTimer); });
  callbackFns.length = 0;
  runtime.startRunningTime = undefined;
  runtime.lastTime = undefined;

  if (clearLoginInfo) { // 删除登录信息
    headers.delete('Cookie');
  }
};
