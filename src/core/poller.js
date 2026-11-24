/**
 * 消息轮询：获取新消息、输出到控制台、发送通知并交给自动回复处理
 */

import { runtime, callbackFns, shownMessages, getCurrentTime } from '../runtime.js';
import { logError } from '../utils/log.js';
import { setCache } from './cache.js';
import { notify } from './notify.js';
import { callAPI } from '../api/client.js';
import { getSessionInfo } from '../api/session.js';
import { getMessages } from '../message/fetch.js';
import { messagesHandler } from '../message/render.js';
import { autoReply } from '../autoreply/reply.js';
import { autoReplyHandler } from '../autoreply/index.js';

export const fetchMessages = async () => { // 获取最新消息
  const currentTime = getCurrentTime(), // 获取当前时间
        sjson = await callAPI('https://api.vc.bilibili.com/session_svr/v1/session_svr/new_sessions',
          { params: { begin_ts: Math.floor((runtime.lastTime - 5000) * 1000) }, includePlatformInfo: true, retries: false }); // 获取上次获取消息前 5 秒内收到的未读的消息
  if (sjson.code === 0) {
    runtime.lastTime = currentTime; // 将上次获取消息的时间设置为变量 currentTime 的值
    if (sjson.data.session_list) {
      for (const s of sjson.data.session_list.toReversed()) {
        setCache('Session', s.session_type, s.talker_id, s);
        const recvMessages = await getMessages(s.talker_id, s.session_type, 50, [], false); // 获取当前会话的最后 50 条消息
        if (recvMessages?.length) {
          const showMessages = [];
          recvMessages.filter(m => !shownMessages.includes(m.msg_key) && m.timestamp >= runtime.startRunningTime / 1000).forEach(m => { // 如果未显示过这条消息，且是在运行之后发送的
            shownMessages.push(m.msg_key); // 将这条消息设置为已显示
            showMessages.push(m); // 将这条消息添加到控制台输出列表
          });

          if (showMessages.length) {
            const sessionInfo = await getSessionInfo(s.talker_id, s.session_type, s); // 获取会话信息
            messagesHandler(showMessages, sessionInfo).then(({ output, notifyObjects }) => {
              output.forEach(o => { console.log(o); });
              notifyObjects.forEach(({ title, message, icon }) => { notify({ title, message, icon: icon && `${icon}@128w_128h_80q_1c.webp` }); });
            });

            showMessages.forEach(m => { // 自动回复处理
              const disableAutoReply = callbackFns.map(f => f.func(m, sessionInfo, f.state)).some(r => r);
              if (!disableAutoReply) { // 允许自动回复
                autoReplyHandler(m, sessionInfo, autoReplyContent => autoReply(m, autoReplyContent, sessionInfo));
              }
            });
          }
        }
      }
    }
  } else {
    logError('获取新消息时出错：', sjson);
  }
};
