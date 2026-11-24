/**
 * 会话：会话信息与会话详情
 */

import { logError } from '../utils/log.js';
import { updatedTimestampSymbol, getCache, setCache } from '../core/cache.js';
import { callAPI } from './client.js';
import { getUserCard } from './user.js';
import { getGroupInfo } from './group.js';

export const getSessionInfo = async (talkerId, sessionType = 1, sessionDetail) => { // 获取会话信息
  if (talkerId === 0 && sessionType === 1) return { talkerId: 0, sessionType: 1, name: null, avatar: null, isSystem: true, groupType: null };
  let name, avatar;
  sessionDetail ??= await getSessionDetail(talkerId, sessionType); // 从 B 站 API 获取会话信息
  if (sessionDetail) {
    if (sessionDetail.system_msg_type) { // 为系统
      ({ name, pic_url: avatar } = sessionDetail.account_info);
    } else if (sessionType === 2) { // 为应援团
      ({ group_name: name, group_cover: avatar } = sessionDetail);
    }
  }
  if (!name) {
    if (sessionType === 2) { // 为应援团
      const info = await getGroupInfo(talkerId);
      if (info) {
        ({ group_name: name, group_cover: avatar } = info);
        if (!name) {
          const card = await getUserCard(info.owner_uid);
          if (card) name = `${card.name}的应援团`;
        }
      }
    }
  }
  return { talkerId, sessionType, name: name || null, avatar: avatar || null, isSystem: !!sessionDetail?.system_msg_type, groupType: sessionDetail?.group_type ?? null };
};
export const getSessionDetail = async (talkerId, sessionType = 1, noCache) => { // 获取会话信息
  let session;
  if (!noCache) session = getCache('Session', sessionType, talkerId);
  if (!session || Date.now() - session[updatedTimestampSymbol] >= 300000) {
    const sjson = await callAPI('https://api.vc.bilibili.com/session_svr/v1/session_svr/session_detail',
      { params: { talker_id: talkerId, session_type: sessionType }, includePlatformInfo: true });
    if (sjson.code === 0) {
      setCache('Session', sessionType, talkerId, sjson.data);
      return sjson.data;
    } else {
      if (sjson.code !== 1000004) { // 当与该会话从未聊过天时会报此错误，可忽略
        logError(`获取 ID 为 ${talkerId}，会话类型为 ${sessionType} 的信息时出错：`, sjson);
      }
      return session ?? null;
    }
  } else {
    return session;
  }
};
