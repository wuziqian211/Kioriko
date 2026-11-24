/**
 * 应援团：应援团信息、成员、权限、粉丝勋章与加入应援团
 */

import { getDate } from '../utils/format.js';
import { trueColorToSupportedColor, style } from '../utils/color.js';
import { logError } from '../utils/log.js';
import { updatedTimestampSymbol, getCache, getCategoryCache, setCache } from '../core/cache.js';
import { callAPI } from './client.js';
import { getUsersInfo } from './user.js';

export const getGroupInfo = async (groupId, noCache) => { // 获取应援团信息
  let group;
  if (!noCache) group = getCache('Group', groupId);
  if (!group || Date.now() - group[updatedTimestampSymbol] >= 300000) {
    const gjson = await callAPI('https://api.vc.bilibili.com/link_group/v1/group/detail',
      { params: { group_id: groupId }, includePlatformInfo: true });
    if (gjson.code === 0) {
      setCache('Group', groupId, gjson.data);
      return gjson.data;
    } else {
      logError(`获取 ID 为 ${groupId} 的应援团信息时出错：`, gjson);
      return group ?? null;
    }
  } else {
    return group;
  }
};
export const getMyGroups = async () => { // 获取加入的所有应援团信息
  const gjson = await callAPI('https://api.vc.bilibili.com/link_group/v1/member/my_groups', { includePlatformInfo: true });
  if (gjson.code === 0) {
    const groupCache = getCategoryCache('Group');
    gjson.data.list.forEach(g => { groupCache.set(g.group_id, { ...g, [updatedTimestampSymbol]: Date.now() }); });
    return gjson.data.list;
  } else {
    logError('获取加入的应援团信息时出错：', gjson);
    return null;
  }
};
export const getMembersList = async (groupId, consoleLog = true) => { // 获取应援团成员信息
  const mjson = await callAPI('https://api.vc.bilibili.com/link_group/v1/group/member_list',
    { params: { group_id: groupId }, includePlatformInfo: true });
  if (mjson.code === 0) {
    if (consoleLog) {
      const [groupInfo, usersInfo] = await Promise.all([getGroupInfo(groupId), getUsersInfo(mjson.data.list.map(m => m.uid))]);
      console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${groupInfo?.group_name ? `${style('blueBright', groupInfo.group_name)} ` : `ID 为${style('yellowBright', groupId)} 的应援团`}的成员列表（${style('cyanBright', mjson.data.list.length)} 人）：`);
      mjson.data.list.forEach(m => { console.log(`${usersInfo.get(m.uid) ? style('cyanBright', usersInfo.get(m.uid).name) : `UID ${style('yellowBright', m.uid)}`}：${m.role === 1 ? style('magentaBright', 'UP / 群主') : m.role === 2 ? style('yellowBright', '管理员') : '普通成员'}`); });
    }
    setCache('GroupMemberRole', groupId, new Map(mjson.data.list.map(m => [m.uid, m.role])));
    return mjson.data.list;
  } else {
    logError(`获取 ID 为 ${groupId} 的应援团成员信息时出错：`, mjson);
    return null;
  }
};
export const getMembersRole = async (groupId, membersMids, noCache) => { // 获取应援团成员权限
  const membersCache = getCategoryCache('GroupMemberRole', groupId);
  if (!noCache) {
    if (membersMids.every(m => membersCache.has(m))) return new Map(membersMids.map(m => [m, membersCache.get(m)]));
  }

  const members = await getMembersList(groupId, false);
  if (members) {
    return new Map(membersMids.map(m => [m, members.find(i => i.uid === m)?.role ?? null]));
  } else {
    return null;
  }
};
export const getFansMedal = async (masterId, fansMids, consoleLog = true, noCache) => { // 通过 UP 主 UID 获取其成员的粉丝勋章等级
  if (!fansMids) {
    const myGroups = await getMyGroups();
    if (myGroups) {
      const groupId = myGroups.find(g => g.owner_uid === masterId)?.group_id;
      if (groupId) fansMids = (await getMembersList(groupId, false))?.map(u => u.uid);
    }
  }
  if (!fansMids?.length) return null;

  fansMids = [...new Set(fansMids)]; // 删除重复项
  const medalsInfo = new Map(fansMids.map(m => [m, null])), medalsCache = getCategoryCache('FansMedal', masterId);
  if (!noCache) fansMids.map(m => medalsCache.get(m)).filter(m => m).forEach(m => { medalsInfo.set(m.uid, m); });

  const restFans = fansMids.filter(m => !medalsInfo.get(m) || Date.now() - medalsInfo.get(m)[updatedTimestampSymbol] >= 300000);
  if (restFans.length) {
    const mjson = await callAPI('https://api.live.bilibili.com/fans_medal/v1/fans_medal/details',
      { params: { master_id: masterId, uids: restFans.join(',') }, includePlatformInfo: true });
    if (mjson.code === 0 && mjson.data.list?.length) {
      for (const m of mjson.data.list) {
        medalsInfo.set(m.uid, m);
        medalsCache.set(m.uid, { ...m, [updatedTimestampSymbol]: Date.now() });
      }
    }
  }

  if (consoleLog) {
    const usersInfo = await getUsersInfo([masterId, ...medalsInfo.keys()]);
    console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${usersInfo.get(masterId) ? style('cyanBright', usersInfo.get(masterId).name) : `UID ${style('yellowBright', masterId)}`} 的成员的粉丝勋章等级：`);
    for (const [, info] of medalsInfo) {
      if (info) {
        const color = trueColorToSupportedColor(info.fans_medal_color);
        console.log(`${usersInfo.get(info.uid) ? style('cyanBright', usersInfo.get(info.uid).name) : `UID ${style('yellowBright', info.uid)}`}：${color[0]}${info.fans_level}${color[1]} 级`);
      }
    }
  }

  return medalsInfo;
};
export const getFansMedalByGroupId = async (groupId, fansMids, consoleLog = true) => { // 通过应援团 ID 获取成员的粉丝勋章等级
  fansMids ??= (await getMembersList(groupId, false))?.map(u => u.uid);
  if (!fansMids?.length) return null;
  fansMids = [...new Set(fansMids)]; // 删除重复项
  const masterId = (await getGroupInfo(groupId))?.owner_uid;
  if (masterId) {
    return getFansMedal(masterId, fansMids, consoleLog);
  } else {
    return null;
  }
};
export const joinGroup = async groupId => { // 加入应援团
  const gjson = await callAPI('https://api.vc.bilibili.com/link_group/v1/group/join_group_without_agree',
    { method: 'POST', body: new URLSearchParams({ group_id: groupId }) });
  if (gjson.code === 0) {
    const info = await getGroupInfo(groupId);
    console.log(`${style('gray', `[${getDate(Date.now())}]`)} 加入 ${info?.group_name ? `${style('blueBright', info.group_name)} ` : `ID 为 ${style('yellowBright', groupId)} 的应援团`}${style('greenBright', '成功')}！`);
  } else {
    logError(`加入 ID 为 ${groupId} 的应援团时出错：`, gjson);
  }
  return gjson;
};
