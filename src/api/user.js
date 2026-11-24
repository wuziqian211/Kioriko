/**
 * 用户：用户信息、名片、搜索、修改签名、官方账号 UID
 */

import { logError } from '../utils/log.js';
import { updatedTimestampSymbol, getCache, getCategoryCache, setCache } from '../core/cache.js';
import { callAPI } from './client.js';

export const getBilibiliUid = async () => {
  const ujson = await callAPI('https://api.vc.bilibili.com/link_setting/v1/link_setting/bilibili_uid');
  if (ujson.code === 0) {
    return ujson.data.uids;
  } else {
    return null;
  }
};
export const getOfficialUids = async () => {
  const ujson = await callAPI('https://api.vc.bilibili.com/link_setting/v1/link_setting/official_uids');
  if (ujson.code === 0) {
    return ujson.data.uids;
  } else {
    return null;
  }
};
export const getUserInfo = async (mid, noCache) => { // 获取用户信息
  let user;
  if (!noCache) user = getCache('User', mid);
  if (!user || Date.now() - user[updatedTimestampSymbol] >= 300000) {
    const ujson = await callAPI('https://api.bilibili.com/x/space/wbi/acc/info',
      { params: { mid, token: '', web_location: 1550101 }, wbiSign: true });
    if (ujson.code === 0) {
      setCache('User', mid, ujson.data);
      return ujson.data;
    } else {
      logError(`获取 UID ${mid} 的信息时出错：`, ujson);
      return user ?? null;
    }
  } else {
    return user;
  }
};
export const getUsersInfo = async (mids, noCache) => { // 获取多个用户的信息
  mids = [...new Set(mids)]; // 删除重复项
  const usersInfo = new Map(mids.map(m => [m, null])), usersCache = getCategoryCache('User');
  if (!noCache) mids.map(m => usersCache.get(m)).filter(u => u).forEach(u => { usersInfo.set(+u.mid, u); });

  const restUsers = mids.filter(m => !usersInfo.get(m) || Date.now() - usersInfo.get(m)[updatedTimestampSymbol] >= 300000), jsonList = [];
  while (restUsers.length) {
    jsonList.push(callAPI('https://api.bilibili.com/x/polymer/pc-electron/v1/user/cards',
      { params: { uids: restUsers.splice(0, 50).join(',') }, includePlatformInfo: true }));
  }

  for await (const cjson of jsonList) {
    if (cjson.code === 0 && cjson.data) {
      for (const [mid, info] of Object.entries(cjson.data)) {
        usersInfo.set(+mid, info);
        usersCache.set(+mid, { ...info, [updatedTimestampSymbol]: Date.now() });
      }
    }
  }
  return usersInfo;
};
export const getUserCard = async (mid, noCache) => { // 获取用户名片信息
  let card;
  if (!noCache) card = getCache('Card', mid);
  if (!card || Date.now() - card[updatedTimestampSymbol] >= 300000) {
    const cjson = await callAPI('https://api.bilibili.com/x/web-interface/card', { params: { mid } });
    if (cjson.code === 0) {
      setCache('Card', mid, cjson.data.card);
      return cjson.data.card;
    } else {
      logError(`获取 UID ${mid} 的名片信息时出错：`, cjson);
      return card ?? null;
    }
  } else {
    return card;
  }
};
export const searchUsers = async name => { // 根据昵称搜索用户
  const sjson = await callAPI('https://api.bilibili.com/x/polymer/web-dynamic/v1/mention/search',
    { params: { keyword: name } });
  if (sjson.code === 0) {
    if (sjson.data.groups) {
      return sjson.data.groups.flatMap(g => g.items);
    } else {
      return [];
    }
  } else {
    return null;
  }
};
export const updateSign = async sign => { // 修改用户签名
  const sjson = await callAPI('https://api.bilibili.com/x/member/web/sign/update',
    { method: 'POST', body: new URLSearchParams({ user_sign: sign }) });
  if (sjson.code !== 0) {
    logError('修改签名时出错：', sjson);
  }
  return sjson;
};
