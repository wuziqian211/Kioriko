/**
 * 发送消息：设置已读与发送各类消息
 */

import fs from 'node:fs/promises';
import sizeOf from 'image-size'; // 获取图片大小
import { runtime, getCurrentTime } from '../runtime.js';
import { getDate } from '../utils/format.js';
import { style } from '../utils/color.js';
import { JSONStringify } from '../utils/json.js';
import { logError } from '../utils/log.js';
import { headers, callAPI } from '../api/client.js';
import { fetchImageMeta, uploadImage } from '../api/image.js';

export const ackMessage = async (talkerId, sessionType = 1, ackSeqno) => { // 设置消息为已读
  const ajson = await callAPI('https://api.vc.bilibili.com/session_svr/v1/session_svr/update_ack',
    { method: 'POST', includePlatformInfo: true, body: new URLSearchParams({ talker_id: talkerId, session_type: sessionType, ack_seqno: ackSeqno }) });
  if (ajson.code === 0) {
    console.log(`${style('gray', `[${getDate(Date.now())}]`)} 已将 ID 为 ${style('yellowBright', talkerId)}，会话类型为 ${style('greenBright', sessionType)} 的 seqno 为 ${style('whiteBright', ackSeqno)} 的消息设置为${style('greenBright', '已读')}`);
  } else {
    logError(`将 ID 为 ${talkerId}，会话类型为 ${sessionType} 的 seqno 为 ${ackSeqno} 的消息设置为已读时出错：`, ajson);
  }
  return ajson;
};
export const sendMessage = async (receiverId, receiverType = 1, msgType = 1, originalContent) => { // 给指定会话发送消息
  let content;
  if (msgType === 1 && typeof originalContent !== 'object') {
    content = JSONStringify({ content: String(originalContent) });
  } else if ([2, 6].includes(msgType) && (typeof originalContent !== 'object' || Buffer.isBuffer(originalContent))) {
    if (Buffer.isBuffer(originalContent) || !/^(?:https?:)?\/\/(?:[is]\d+\.hdslb\.com|[-0-9a-z]+\.biliimg\.com)\//.test(originalContent)) {
      const img = Buffer.isBuffer(originalContent) ? originalContent : /^(?:https?:)?\/\//.test(originalContent) ? Buffer.from(await (await fetch(new URL(originalContent, 'https://i0.hdslb.com/'), { headers })).arrayBuffer()) : await fs.readFile(originalContent);
      const { type: imageType } = sizeOf(img),
            ijson = await uploadImage(img);
      if (ijson.code !== 0) return null;
      content = JSONStringify({ url: ijson.data.image_url, height: ijson.data.image_height, width: ijson.data.image_width, imageType, original: 1, size: ijson.data.img_size });
    } else {
      content = JSONStringify(await fetchImageMeta(originalContent)); // 图片已在 B 站图床中，无需上传，直接读取图片信息
    }
  } else {
    content = JSONStringify(originalContent);
  }

  const { AccountInfo: { mid: selfMid, deviceId } } = runtime.config;
  const body = new URLSearchParams({ 'msg[sender_uid]': selfMid, 'msg[receiver_id]': receiverId, 'msg[receiver_type]': receiverType, 'msg[msg_type]': msgType, 'msg[msg_status]': 0, 'msg[content]': content, 'msg[timestamp]': Math.floor(getCurrentTime() / 1000), 'msg[new_face_version]': 1, 'msg[dev_id]': deviceId, from_firework: 0 });
  const mjson = await callAPI('https://api.vc.bilibili.com/web_im/v1/web_im/send_msg',
    { method: 'POST', params: { w_sender_uid: selfMid, w_receiver_id: receiverId, w_dev_id: deviceId }, wbiSign: true, body, requiredKeys: ['code', 'data'] });
  if (mjson.code === 0) {
    console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${style('greenBright', '成功')}发送消息到 ID ${style('yellowBright', receiverId)}，会话类型 ${style('greenBright', receiverType)}，msg_key ${style('whiteBright', mjson.data.msg_key)}`);
  } else {
    logError(`给 ID 为 ${receiverId}，会话类型为 ${receiverType} 发送消息时出错：`, mjson);
  }
  return mjson;
};
