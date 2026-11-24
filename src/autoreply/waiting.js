/**
 * 等待用户回复：命令需要用户进一步选择时使用（例如 “获取信息” 的参数为纯数字时）
 */

import { callbackFns } from '../runtime.js';
import { JSONParse } from '../utils/json.js';
import { ArrayFilterWithModifications } from '../utils/misc.js';

/*
 * 等待中的条目保存在 runtime.js 的 callbackFns 里，格式为：
 * { func: callback, state: { type: 'autoReplyWaiting', talkerId, sessionType, senderUid, repliedMessageKey, timeoutTimer } }
 * core/poller.js 收到新消息时会依次调用每个 func，任一 func 返回 true 时不再自动回复该消息。
 */

export const cancelWaiting = predicate => { // 取消满足条件的等待：清除超时计时器，并从 callbackFns 中移除
  const isTarget = ({ state }) => state.type === 'autoReplyWaiting' && predicate(state);
  callbackFns.filter(isTarget).forEach(({ state }) => { clearTimeout(state.timeoutTimer); });
  ArrayFilterWithModifications(callbackFns, f => !isTarget(f));
};

/**
 * 等待指定用户在指定会话中回复一条文字消息
 * @param {object} options
 * @param {number} options.talkerId 会话 ID
 * @param {number} options.sessionType 会话类型
 * @param {number} options.senderUid 等待回复的用户的 UID
 * @param {string} options.repliedMessageKey 触发这次等待的消息的 msg_key（对方撤回这条消息时会取消等待）
 * @param {number} options.selfMid 自己的 UID
 * @param {number} options.timeout 超时时间（毫秒）
 * @param {(text: string) => any} options.parse 解析用户回复的文本（已去除首尾空白）；返回 null 或 undefined 表示不是想要的回复，继续等待
 * @param {() => Promise<any>} options.onTimeout 超时后调用，其返回值作为结果
 * @returns {Promise<any>} parse 或 onTimeout 的返回值
 */
export const waitForReply = ({ talkerId, sessionType, senderUid, repliedMessageKey, selfMid, timeout, parse, onTimeout }) => new Promise(resolve => {
  const state = { type: 'autoReplyWaiting', talkerId, sessionType, senderUid, repliedMessageKey };
  const finish = () => {
    clearTimeout(state.timeoutTimer);
    ArrayFilterWithModifications(callbackFns, f => f.state !== state);
  };

  state.timeoutTimer = setTimeout(async () => { // 在超时后调用此函数
    finish();
    resolve(await onTimeout());
  }, timeout);

  const callback = (message, sessionInfo) => {
    if (sessionInfo.talkerId === state.talkerId && sessionInfo.sessionType === state.sessionType &&
      message.sender_uid === state.senderUid && (state.sessionType !== 1 || message.receiver_id === selfMid) &&
      message.msg_type === 1) {
      const result = parse(JSONParse(message.content).content.trim());
      if (result !== null && result !== undefined) {
        finish();
        resolve(result); // 返回处理后的数据
        return true; // 不自动回复本消息
      }
    }
  };
  callbackFns.push({ func: callback, state });
});
