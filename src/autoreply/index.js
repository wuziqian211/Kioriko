/**
 * 自动回复入口：过滤消息，再分发给用户自定义命令、内置命令或 AI 对话；对方撤回消息时撤回对应的自动回复
 */

import { runtime, autoReplyMessages, officialUids } from '../runtime.js';
import { messageSources } from '../constants.js';
import { JSONParse } from '../utils/json.js';
import { wait } from '../utils/misc.js';
import { loadUserConfig } from '../core/config.js';
import { getUserCard } from '../api/user.js';
import { cancelWaiting } from './waiting.js';
import { findCommand } from './commands/index.js';
import { aiChat } from '../ai/chat.js';

/**
 * 传给命令与 AI 对话的上下文 ctx 包含以下字段：
 * - repliedMessage：被回复的消息（B 站接口返回的原始消息对象）
 * - content：已解析的消息内容（文字消息为 { content: '文本' }）
 * - selfMid：自己的 UID
 * - senderUid：消息发送者的 UID
 * - talkerId、sessionType：会话 ID 与会话类型（1 为私信，2 为应援团）
 * - repliedMessageKey：被回复的消息的 msg_key
 * - msgSource：消息来源代码（见 constants.js 中的 messageSources）
 * - autoReplyFn：自动回复函数，参数为消息数组，例如 [{ msgType: 1, content: { content: '文本' } }]
 * 以下字段只有文字消息才有：
 * - userInput：去掉 at 自己的部分与开头的指令符号后的文本
 * - args：userInput 按空白分割后的数组，args[0] 为命令名
 * - isMentioned：自己是否被 at
 */

const handleTextMessage = async ctx => { // 处理文字消息：用户自定义命令 → 内置命令 → AI 对话
  const { repliedMessage, content, selfMid, senderUid, sessionType, autoReplyFn } = ctx;
  let isMentioned = repliedMessage.at_uids?.includes(selfMid), // 自己是否被 at
      userInput = content.content;
  if (/@[^ ]+ |@[^ ]$/.test(userInput)) { // B 站网页版私信不支持直接 at，故判断消息内容中是否含有 at 自己的部分
    const { name: selfName } = await getUserCard(selfMid);
    const atRegExp = new RegExp(`@${selfName} |@${selfName}$`, 'gm');
    if (atRegExp.test(userInput)) {
      isMentioned = true;
      userInput = userInput.replace(atRegExp, ''); // 过滤掉 at 自己的部分
    }
  }
  userInput = userInput.replace(/^\s*[#＃/>]/, ''); // 去除开头的指令符号
  const args = userInput.trim().split(/\s+/g);

  const { definedCommands } = await loadUserConfig(senderUid); // 用户自定义命令
  const definedCommand = definedCommands?.find(c => c.commandText === content.content);
  if (definedCommand) {
    autoReplyFn([{ msgType: 1, content: { content: definedCommand.text }, autoReplyMark: false }]);
    return;
  }

  const command = findCommand(args[0]); // 内置命令
  if (command) {
    await command.run({ ...ctx, userInput, args, isMentioned });
  } else if (sessionType !== 2 || isMentioned) { // 不是命令就使用 AI 对话；在应援团中只有 at 了自己才能使用 AI 对话
    await aiChat(ctx);
  }
};

const handleWithdrawal = async ({ content, talkerId, sessionType, senderUid, autoReplyFn }) => { // 对方撤回消息时，取消对应的等待，并撤回对这条消息的自动回复
  cancelWaiting(state => state.talkerId === talkerId && state.sessionType === sessionType && state.senderUid === senderUid && state.repliedMessageKey === content);
  await wait(1000);
  const autoReplyMessageKeys = autoReplyMessages.filter(m => m.repliedMessageKey === content).map(m => m.replyMessageKey);
  if (autoReplyMessageKeys.length) {
    autoReplyFn(autoReplyMessageKeys.map(k => ({ msgType: 5, content: k }))); // 撤回自动回复的消息
  }
};

export const autoReplyHandler = async (repliedMessage, sessionInfo = {}, autoReplyFn) => { // 自动回复处理
  const { AccountInfo: { mid: selfMid } } = runtime.config,
        { sender_uid: senderUid, receiver_id: receiverId = selfMid, msg_type: msgType = 1, content: originalContent, msg_key: repliedMessageKey, msg_source: msgSource } = repliedMessage,
        { talkerId, sessionType = 1 } = sessionInfo;

  const shouldReply = senderUid !== selfMid && (sessionType !== 1 || (receiverId === selfMid && !officialUids.includes(talkerId))) && !officialUids.includes(senderUid) &&
    ![1, 2].includes(repliedMessage.msg_status) && !messageSources.get(msgSource)?.bySystem; // 发送者不为自己与官方账号，消息状态正常，且不是系统发送的消息
  if (!shouldReply) return;

  const ctx = { repliedMessage, content: JSONParse(originalContent), selfMid, senderUid, talkerId, sessionType, repliedMessageKey, msgSource, autoReplyFn };
  switch (msgType) {
    case 1: // 文字消息
      await handleTextMessage(ctx);
      break;
    case 5: // 撤回消息
      await handleWithdrawal(ctx);
      break;

    // No default
  }
};
