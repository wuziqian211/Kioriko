/**
 * 用户关系：状态数、关注关系、关注分组，以及关注、取关、特别关注
 */

import util from 'node:util';
import { runtime } from '../runtime.js';
import { getDate } from '../utils/format.js';
import { style } from '../utils/color.js';
import { logError } from '../utils/log.js';
import { callAPI } from './client.js';
import { getUserInfo, getUsersInfo } from './user.js';

export const getUserStat = async (mid, consoleLog = true) => { // 获取用户状态数
  const sjson = await callAPI('https://api.bilibili.com/x/relation/stat', { params: { vmid: mid } });
  if (sjson.code === 0) {
    if (consoleLog) {
      const info = await getUserInfo(mid);
      console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${info ? style('cyanBright', info.name) : `UID ${style('yellowBright', mid)}`} 的状态数：
${style(['bold', 'whiteBright'], '关注数：')}${style('yellowBright', sjson.data.following)}
${style(['bold', 'whiteBright'], '粉丝数：')}${style('cyanBright', sjson.data.follower)}`);
    }
    return sjson.data;
  } else {
    logError(`获取 UID ${mid} 的状态数时出错：`, sjson);
    return null;
  }
};
export const getUsersStat = async (mids, consoleLog = true) => { // 获取多个用户的状态数
  const sjson = await callAPI('https://api.bilibili.com/x/relation/stats', { params: { mids: mids.join(',') } });
  if (sjson.code === 0) {
    if (consoleLog) {
      const usersInfo = await getUsersInfo(mids);
      Object.entries(sjson.data).forEach(([mid, stat]) => { console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${usersInfo.get(+mid) ? style('cyanBright', usersInfo.get(+mid).name) : `UID ${style('yellowBright', mid)}`} 的状态数：${style('yellowBright', stat.following)} ${style(['bold', 'whiteBright'], '关注')}，${style('cyanBright', stat.follower)} ${style(['bold', 'whiteBright'], '粉丝')}，${style('gray', stat.whisper)} ${style(['bold', 'whiteBright'], '悄悄关注')}，${style('redBright', stat.black)} ${style(['bold', 'whiteBright'], '拉黑')}`); });
    }
    return sjson.data;
  } else {
    logError(`获取 UID ${mids.join('、')} 的状态数时出错：`, sjson);
    return null;
  }
};
export const getUserRelation = async (mid, consoleLog = true) => { // 获取用户关系
  const rjson = await callAPI('https://api.bilibili.com/x/web-interface/relation', { params: { mid } });
  if (rjson.code === 0) {
    if (consoleLog) {
      const info = await getUserInfo(mid);
      if (mid === runtime.config.AccountInfo.mid) {
        console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${info ? style('cyanBright', info.name) : `UID ${style('yellowBright', mid)}`} 与您的关系：${style('whiteBright', '您时时刻刻都在关注着自己 (*^▽^*)')}`);
      } else {
        console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${info ? style('cyanBright', info.name) : `UID ${style('yellowBright', mid)}`} 与您的关系：
${style(['bold', 'whiteBright'], '您 → TA：')}您${rjson.data.relation.attribute === 1 ? `${style('gray', '悄悄关注')}了` : [2, 6].includes(rjson.data.relation.attribute) ? rjson.data.relation.special ? `${style('magentaBright', '特别关注')}了` : `${style('yellowBright', '关注')}了` : rjson.data.relation.attribute === 128 ? `${style('redBright', '拉黑')}了` : style('whiteBright', '没有关注')} TA${rjson.data.relation.tag?.some(g => g !== -10) ? `；${style(['bold', 'whiteBright'], '关注分组 ID：')}${rjson.data.relation.tag.filter(g => g !== -10).join('、')}` : rjson.data.relation.tag?.includes(-10) ? `；${style(['bold', 'whiteBright'], '关注分组：')}特别关注` : [1, 2, 6].includes(rjson.data.relation.attribute) ? `；${style(['bold', 'whiteBright'], '关注分组：')}默认分组` : ''}${rjson.data.relation.mtime ? `；${style(['bold', 'whiteBright'], '改变关系时间：')}${getDate(rjson.data.relation.mtime * 1000)}` : ''}
${style(['bold', 'whiteBright'], 'TA → 您：')}TA ${rjson.data.be_relation.attribute === 1 ? `${style('gray', '悄悄关注')}了` : [2, 6].includes(rjson.data.be_relation.attribute) ? rjson.data.be_relation.special ? `${style('magentaBright', '特别关注')}了` : `${style('yellowBright', '关注')}了` : rjson.data.be_relation.attribute === 128 ? `${style('redBright', '拉黑')}了` : style('whiteBright', '没有关注')}您${rjson.data.be_relation.tag?.some(g => g !== -10) ? `；${style(['bold', 'whiteBright'], '关注分组 ID：')}${rjson.data.be_relation.tag.filter(g => g !== -10).join('、')}` : rjson.data.be_relation.tag?.includes(-10) ? `；${style(['bold', 'whiteBright'], '关注分组：')}特别关注` : [1, 2, 6].includes(rjson.data.be_relation.attribute) ? `；${style(['bold', 'whiteBright'], '关注分组：')}默认分组` : ''}${rjson.data.be_relation.mtime ? `；${style(['bold', 'whiteBright'], '改变关系时间：')}${getDate(rjson.data.be_relation.mtime * 1000)}` : ''}`);
      }
    }
    return rjson.data;
  } else {
    logError(`获取 UID ${mid} 的关系时出错：`, rjson);
    return null;
  }
};
export const getUsersRelation = async (mids, consoleLog = true) => { // 获取多个用户的关系
  const rjson = await callAPI('https://api.bilibili.com/x/relation/interrelations', { params: { fids: mids.join(',') } });
  if (rjson.code === 0) {
    if (consoleLog) {
      const usersInfo = await getUsersInfo(mids);
      Object.entries(rjson.data).forEach(([mid, relation]) => { console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${usersInfo.get(+mid) ? style('cyanBright', usersInfo.get(+mid).name) : `UID ${style('yellowBright', mid)}`} 与您的关系：
${style(['bold', 'whiteBright'], '您 → TA：')}您${relation.attribute === 1 ? `${style('gray', '悄悄关注')}了` : [2, 6].includes(relation.attribute) ? relation.special ? `${style('magentaBright', '特别关注')}了` : `${style('yellowBright', '关注')}了` : relation.attribute === 128 ? `${style('redBright', '拉黑')}了` : style('whiteBright', '没有关注')} TA${relation.tag?.some(g => g !== -10) ? `；${style(['bold', 'whiteBright'], '关注分组 ID：')}${relation.tag.filter(g => g !== -10).join('、')}` : relation.tag?.includes(-10) ? `；${style(['bold', 'whiteBright'], '关注分组：')}特别关注` : [1, 2, 6].includes(relation.attribute) ? `；${style(['bold', 'whiteBright'], '关注分组：')}默认分组` : ''}
${style(['bold', 'whiteBright'], 'TA → 您：')}TA ${relation.is_followed ? `${style('yellowBright', '关注')}了` : relation.is_blacked ? `${style('redBright', '拉黑')}了` : style('whiteBright', '没有关注')}您${relation.mtime ? `\n${style(['bold', 'whiteBright'], '改变关系时间：')}${getDate(relation.mtime * 1000)}` : ''}`); });
    }
    return rjson.data;
  } else {
    logError(`获取 UID ${mids.join('、')} 的关系时出错：`, rjson);
    return null;
  }
};
export const modifyUserRelation = async (mid, action) => { // 修改用户关系
  const actions = new Map([
    [1, [`${style('yellowBright', '关注')} %s `, '关注 %s ']],
    [2, [`${style('redBright', '取消关注')} %s `, '取消关注 %s ']],
    [4, [`${style('whiteBright', '取消悄悄关注')} %s `, '取消悄悄关注 %s ']],
    [5, [`将 %s ${style('redBright', '加入黑名单')}`, '将 %s 加入黑名单']],
    [6, [`将 %s ${style('whiteBright', '移出黑名单')}`, '将 %s 移出黑名单']],
    [7, [`将 %s ${style('redBright', '移除粉丝')}`, '将 %s 移除粉丝']],
  ]);
  if (!actions.has(action)) console.warn(`${style('gray', `[${getDate(Date.now())}]`)} ${style('yellowBright', '警告：')}${style('whiteBright', '修改用户关系的操作代码无效')}`);
  const rjson = await callAPI('https://api.bilibili.com/x/relation/modify',
    { method: 'POST', body: new URLSearchParams({ fid: mid, act: action, re_src: 11 }) });
  if (rjson.code === 0) {
    const info = await getUserInfo(mid);
    console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${util.format(actions.has(action) ? actions.get(action)[0] : `对 %s 执行代码为 ${style('yellowBright', action)} 的操作`, info ? style('cyanBright', info.name) : `UID ${style('yellowBright', mid)}`)}${style('greenBright', '成功')}！`);
  } else {
    logError(`${util.format(actions.has(action) ? actions.get(action)[1] : `对 %s 执行代码为 ${action} 的操作`, `UID ${mid}`)}失败：`, rjson);
  }
  return rjson;
};
export const modifyUsersRelation = async (mids, action) => { // 修改多个用户的关系
  const actions = new Map([[1, [`${style('yellowBright', '关注')} %s `, '关注 %s ']], [5, [`将 %s ${style('redBright', '加入黑名单')}`, '将 %s 加入黑名单']]]);
  if (!actions.has(action)) console.warn(`${style('gray', `[${getDate(Date.now())}]`)} ${style('yellowBright', '警告：')}${style('whiteBright', '修改多个用户关系的操作代码无效')}`);
  const rjson = await callAPI('https://api.bilibili.com/x/relation/batch/modify',
    { method: 'POST', body: new URLSearchParams({ fids: mids.join(','), act: action, re_src: 11 }), requiredKeys: ['code', 'data'] });
  if (rjson.code === 0) {
    const { successfulMids, failedMids } = Object.groupBy(mids, m => rjson.data.failed_fids.includes(m) ? 'failedMids' : 'successfulMids'),
          usersInfo = await getUsersInfo(mids);
    if (successfulMids?.length) {
      console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${util.format(actions.has(action) ? actions.get(action)[0] : `对 %s 执行代码为 ${style('yellowBright', action)} 的操作`, successfulMids.map(m => usersInfo.get(m) ? style('cyanBright', usersInfo.get(m).name) : `UID ${style('yellowBright', m)}`).join('、'))}${style('greenBright', '成功')}！`);
    }
    if (failedMids?.length) {
      console.error(`${style('gray', `[${getDate(Date.now())}]`)} ${style(['bold', 'redBright'], '操作失败的用户：')}${failedMids.map(m => usersInfo.get(m) ? style('cyanBright', usersInfo.get(m).name) : `UID ${style('yellowBright', m)}`).join('、')}`);
    }
  } else {
    logError(`${util.format(actions.has(action) ? actions.get(action)[1] : `对 %s 执行代码为 ${action} 的操作`, `UID ${mids.join('、')}`)}失败：`, rjson);
  }
  return rjson;
};
export const getRelationTagsList = async (consoleLog = true) => { // 获取关注分组列表
  const rjson = await callAPI('https://api.bilibili.com/x/relation/tags');
  if (rjson.code === 0) {
    if (consoleLog) {
      console.log(`${style('gray', `[${getDate(Date.now())}]`)} 您的关注分组列表：`);
      rjson.data.forEach(t => { console.log(`${style(['bold', 'whiteBright'], t.name)}（ID：${style('yellowBright', t.tagid)}${t.tip ? `；${t.tip}` : ''}）${style(['bold', 'whiteBright'], '：')}${style('cyanBright', t.count)} 个用户`); });
    }
    return rjson.data;
  } else {
    logError('获取关注分组列表时出错：', rjson);
    return null;
  }
};
export const getUserRelationTags = async (mid, consoleLog = true) => { // 获取用户的关注分组
  const rjson = await callAPI('https://api.bilibili.com/x/relation/tag/user', { params: { fid: mid } });
  if (rjson.code === 0) {
    const relationTags = new Map(rjson.data ? Object.entries(rjson.data) : undefined);
    if (consoleLog) {
      const info = await getUserInfo(mid);
      console.log(`${style('gray', `[${getDate(Date.now())}]`)} 您对 ${info ? style('cyanBright', info.name) : `UID ${style('yellowBright', mid)}`} 的关注分组：${relationTags.size ? [...relationTags].map(([id, name]) => `${style('whiteBright', name)}（${style('yellowBright', id)}）`).join('、') : '默认分组或未关注'}`);
    }
    return relationTags;
  } else {
    logError(`获取对 UID ${mid} 的关注分组时出错：`, rjson);
    return null;
  }
};
export const modifyUsersRelationTags = async (mids, tagids = [0]) => { // 修改用户的关注分组
  const rjson = await callAPI('https://api.bilibili.com/x/relation/tags/addUsers',
    { method: 'POST', body: new URLSearchParams({ fids: Array.isArray(mids) ? mids.join(',') : mids, tagids: Array.isArray(tagids) ? tagids.join(',') : tagids }) });
  if (rjson.code === 0) {
    console.log(`${style('gray', `[${getDate(Date.now())}]`)} 修改用户关注分组${style('greenBright', '成功')}！`);
  } else {
    logError('修改用户关注分组失败：', rjson);
  }
  return rjson;
};
export const copyUsersTo = async (mids, tagids) => { // 添加用户到指定关注分组
  const rjson = await callAPI('https://api.bilibili.com/x/relation/tags/copyUsers',
    { method: 'POST', body: new URLSearchParams({ fids: Array.isArray(mids) ? mids.join(',') : mids, tagids: Array.isArray(tagids) ? tagids.join(',') : tagids }) });
  if (rjson.code === 0) {
    console.log(`${style('gray', `[${getDate(Date.now())}]`)} 添加用户到关注分组${style('greenBright', '成功')}！`);
  } else {
    logError('添加用户到关注分组失败：', rjson);
  }
  return rjson;
};
export const moveUsersFrom = async (beforeTagids = [0], afterTagids = [0], mids) => { // 移动用户到指定关注分组
  const rjson = await callAPI('https://api.bilibili.com/x/relation/tags/moveUsers',
    { method: 'POST', body: new URLSearchParams({ beforeTagids: Array.isArray(beforeTagids) ? beforeTagids.join(',') : beforeTagids, afterTagids: Array.isArray(afterTagids) ? afterTagids.join(',') : afterTagids, fids: Array.isArray(mids) ? mids.join(',') : mids }) });
  if (rjson.code === 0) {
    console.log(`${style('gray', `[${getDate(Date.now())}]`)} 移动用户到关注分组${style('greenBright', '成功')}！`);
  } else {
    logError('移动用户到关注分组失败：', rjson);
  }
  return rjson;
};
export const follow = mid => modifyUserRelation(mid, 1); // 关注指定用户
export const unfollow = mid => modifyUserRelation(mid, 2); // 取消关注指定用户
export const specialFollow = mids => copyUsersTo(mids, [-10]); // 特别关注指定用户
