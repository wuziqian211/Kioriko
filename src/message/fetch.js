/**
 * 获取消息：指定会话的最近消息与全部历史消息
 */

import { messages } from '../runtime.js';
import { getDate } from '../utils/format.js';
import { style } from '../utils/color.js';
import { wait } from '../utils/misc.js';
import { logError } from '../utils/log.js';
import { callAPI } from '../api/client.js';
import { getSessionInfo } from '../api/session.js';
import { messagesHandler } from './render.js';

export const getMessages = async (talkerId, sessionType = 1, size = 50, [beginSeqno, endSeqno] = [], consoleLog = true) => { // 获取指定会话、指定数量的消息
  if (!size || size <= 0 || (beginSeqno ?? 0) + 1 > (endSeqno ?? Infinity) - 1) return [];
  const mjson = await callAPI('https://api.vc.bilibili.com/svr_sync/v1/svr_sync/fetch_session_msgs',
    { params: { talker_id: talkerId, session_type: sessionType, size, begin_seqno: beginSeqno ?? '', end_seqno: endSeqno ?? '', sender_device_id: 1 }, includePlatformInfo: true, wbiSign: true });
  if (mjson.code === 0) {
    if (mjson.data.messages?.length) {
      mjson.data.messages.reverse();
      messages.push(...mjson.data.messages.filter(m => !messages.some(r => r.msg_key === m.msg_key))); // 如果 messages 数组不包含这条消息就加入数组
      if (consoleLog) {
        (await messagesHandler(mjson.data.messages, await getSessionInfo(talkerId, sessionType))).output.forEach(o => { console.log(o); });
      }
      return mjson.data.messages;
    } else {
      return [];
    }
  } else {
    logError(`获取 ID 为 ${talkerId}，会话类型为 ${sessionType} 的消息时出错：`, mjson);
    return null;
  }
};
export const getAllMessages = async (talkerId, sessionType = 1, size = 1000, timeout = 500, consoleLog = true) => { // 获取指定会话的所有消息
  if (!size || size <= 0) return [];
  const gotMessages = [];
  let endSeqno, mjson = await getMessages(talkerId, sessionType, size, [], false);
  while (mjson?.length) { // 如果有更早的消息可以获取就继续循环
    gotMessages.unshift(...mjson); // 将本次获取的消息添加到获取到的该会话消息列表之前
    endSeqno = mjson.filter(m => m.msg_type !== 18)[0]?.msg_seqno; // 本次获取的最早的消息的 seqno
    if (!endSeqno) break;

    if (process.stdout.isTTY) {
      process.stdout.cursorTo(0); // 将光标移至当前行的开头
      process.stdout.clearLine(1); // 清除当前行中光标之后的内容
      process.stdout.write(`已获取 ${style('cyanBright', gotMessages.length)} 条消息，最早发送于 ${style('yellowBright', getDate(mjson.filter(m => m.msg_type !== 18)[0].timestamp * 1000))}，seqno ${style('whiteBright', endSeqno)}`);
    }

    await wait(timeout);

    mjson = await getMessages(talkerId, sessionType, size, [, endSeqno], false);
  }

  if (process.stdout.isTTY) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine(1);
  }

  if (consoleLog && gotMessages.length) {
    if (process.stdout.isTTY) process.stdout.write(`${style('greenBright', '已完成获取')}，共 ${style('cyanBright', gotMessages.length)} 条消息，正在处理消息...`);
    const { output } = await messagesHandler(gotMessages, await getSessionInfo(talkerId, sessionType));
    if (process.stdout.isTTY) {
      process.stdout.cursorTo(0);
      process.stdout.clearLine(1);
    }
    output.forEach(o => { console.log(o); });
  }

  console.log(`${style('gray', `[${getDate(Date.now())}]`)} 获取到了 ${style('cyanBright', gotMessages.length)} 条消息，其中 ${style('yellowBright', gotMessages.filter(m => ![1, 2].includes(m.msg_status) && ![5, 18, 51].includes(m.msg_type)).length)} 条消息为没有被撤回的消息`);

  return gotMessages;
};
