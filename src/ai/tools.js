/**
 * AI 工具：工具定义与本地执行
 */

import { USER_AGENT } from '../constants.js';
import { getUserInfo } from '../api/user.js';
import { getVideoInfo } from '../api/video.js';

export const toolDefinitions = [ // 提供给 AI 的工具；deepseek_* 为服务端工具，其余的由 runTool 在本地执行
  { type: 'deepseek_web_search' },
  { type: 'deepseek_read_url' },
  {
    type: 'function',
    function: {
      name: 'getDate',
      description: '获取当前日期与时间',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'makeRequest',
      description: '发送 HTTP 请求并返回响应原始内容，仅支持 GET 请求方法',
      parameters: { type: 'object', properties: { url: { type: 'string', description: '网页的完整 URL' } }, required: ['url'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getUserInfo',
      description: '通过 UID 获取 B 站用户信息，其中 UID 为正整数，用户必须提供 B 站 UID 才能调用',
      parameters: { type: 'object', properties: { uid: { type: 'integer', description: 'B 站 UID', minimum: 1 } }, required: ['uid'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getVideoInfo',
      description: '通过 BV 号或 AV 号获取 B 站视频信息，其中 BV 号是以 “BV1” 开头的总长度为 12 的字符串，AV 号为正整数，用户必须提供 BV 号或 AV 号中的其中一个才能调用',
      parameters: { type: 'object', properties: { av: { type: 'integer', description: 'AV 号', minimum: 1 }, bv: { type: 'string', description: 'BV 号', pattern: 'BV1[1-9A-HJ-NP-Za-km-z]{9}' } }, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sendImage',
      description: '给用户发送图片消息，图片必须是网络图片，且 URL 必须以 http:// 或 https:// 开头。可用于在获取用户信息时发送头像，或获取视频信息时发送封面图等',
      parameters: { type: 'object', properties: { url: { type: 'string', description: '图片的 URL' } }, required: ['url'], additionalProperties: false },
    },
  },
];

export const runTool = async (funcName, funcArgs, autoReplyFn) => { // 执行 AI 调用的本地工具，返回值会被序列化后作为工具消息的内容
  switch (funcName) {
    case 'getDate': {
      const now = new Date();
      return { success: true, data: { date: now.toISOString(), timestamp: now.getTime() } };
    }
    case 'makeRequest': {
      const resp = await fetch(funcArgs.url,
        { method: 'GET', headers: new Headers({ 'User-Agent': USER_AGENT }) });
      return { success: resp.ok, data: { status: resp.status, headers: Object.fromEntries(resp.headers), body: await resp.text() } };
    }
    case 'getUserInfo': {
      const info = await getUserInfo(funcArgs.uid, true);
      return info ? { success: true, data: info } : { success: false };
    }
    case 'getVideoInfo': {
      const info = await getVideoInfo(funcArgs.bv || funcArgs.av, true);
      return info ? { success: true, data: info } : { success: false };
    }
    case 'sendImage': {
      if (typeof funcArgs.url === 'string' && /^https?:\/\/.+$/.test(funcArgs.url)) {
        await autoReplyFn([{ msgType: 2, content: funcArgs.url }]);
        return { success: true };
      } else {
        return { success: false, error: '无效的图片 URL' };
      }
    }
    default: {
      return { success: false, error: '无效的工具' };
    }
  }
};
