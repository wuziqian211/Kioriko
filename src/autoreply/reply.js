/**
 * 发送自动回复：加前缀、分段、撤回 B 站自带的自动回复，并提示受限用户
 */

import { runtime, messages, autoReplyMessages, getCurrentTime } from '../runtime.js';
import { wait } from '../utils/misc.js';
import { loadUserConfig, saveUserConfig } from '../core/config.js';
import { getUserCard } from '../api/user.js';
import { getUserRelation } from '../api/relation.js';
import { ackMessage, sendMessage } from '../message/send.js';

export const autoReply = async (repliedMessage, autoReplyContent, sessionInfo) => { // 自动回复
  const { AccountInfo: { mid: selfMid } } = runtime.config,
        { sender_uid: senderUid, msg_key: repliedMessageKey, msg_seqno: repliedMessageSeqno } = repliedMessage,
        { talkerId, sessionType } = sessionInfo;
  if (autoReplyContent) {
    if (![1, 2].includes(repliedMessage.msg_status) && ![5, 18, 51].includes(repliedMessage.msg_type)) {
      ackMessage(talkerId, sessionType, repliedMessageSeqno); // 设置这条消息为已读
    }

    if (sessionType === 1) { // 撤回 B 站自动回复的消息
      messages.filter(m => m.sender_uid === selfMid && m.receiver_type === 1 && m.receiver_id === talkerId && m.msg_type === 1 &&
        ![1, 2].includes(m.msg_status) && m.msg_source === 9 && getCurrentTime() - m.timestamp * 1000 < 120000)
        .forEach(m => { sendMessage(talkerId, 1, 5, m.msg_key); });
    }

    const replyContent = [];
    for (const c of autoReplyContent) { // 给文字消息添加自动回复前缀
      if (c.msgType === 1) {
        const autoReplyMark = c.autoReplyMark === true ? '自动回复' : c.autoReplyMark === false ? undefined
          : c.autoReplyMark ?? '自动回复';
        let content;
        if (sessionType === 2) {
          content = autoReplyMark ? `【${autoReplyMark}】@${(await getUserCard(senderUid)).name} ${c.content.content}` : c.content.content;
        } else {
          content = autoReplyMark ? `【${autoReplyMark}】${c.content.content}` : c.content.content;
        }
        while (content.length) {
          replyContent.push({ msgType: 1, content: { content: content.slice(0, 660) } });
          content = content.slice(660);
        }
      } else {
        replyContent.push(c);
      }
    }

    for (const c of replyContent) { // 自动回复消息
      if ([1, 2].includes(repliedMessage.msg_status)) break; // 防止用户撤回消息后继续自动回复
      if ([5, 8, 51].includes(c.msgType)) {
        sendMessage(talkerId, sessionType, c.msgType, c.content)
          .then(mjson => autoReplyMessages.push({ repliedMessageKey, replyMessageKey: mjson.data.msg_key }));
      } else {
        const mjson = await sendMessage(talkerId, sessionType, c.msgType, c.content);
        if (mjson.code === 0) autoReplyMessages.push({ repliedMessageKey, replyMessageKey: mjson.data.msg_key });
        await wait(200);
      }
    }

    if (sessionType === 1 && senderUid !== selfMid) { // 判断在自动回复前，对方给自己发送消息是否可能受到限制
      const userConfig = await loadUserConfig(senderUid);
      if (!userConfig.unrestricted) {
        const messagesSentToMe = messages.filter(m => m.sender_uid === talkerId && m.receiver_type === 1 && m.receiver_id === selfMid);
        if ([1, 5, 10, 11, 12, 16, 51].includes(messagesSentToMe.at(-1)?.msg_type)) { // 一般来说，给自己发送消息处于受限状态的用户只能发送纯文字消息或撤回消息，或者自动回复/自动推送消息
          const relation = await getUserRelation(talkerId);
          if (!relation || ![2, 6].includes(relation.relation.attribute)) { // 获取对方与自己的关系失败，或者自己没有关注对方
            sendMessage(talkerId, 1, 1, { content: '【自动回复】您现在可以发送其他消息啦[tv_微笑]\n（注意：梦春酱不使用 B 站的自动回复功能回复您的消息）' });
          }
        }
        userConfig.unrestricted = true;
        saveUserConfig(senderUid, userConfig);
      }
    }
  }
};
