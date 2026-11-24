/**
 * 日志：时间前缀与统一格式的错误日志
 */

import { getDate } from './format.js';
import { style } from './color.js';

export const timestamp = () => style('gray', `[${getDate(Date.now())}]`); // 日志开头的时间

/**
 * 输出错误日志，格式为 “[时间] 标题错误信息（错误码）”
 * @param {string} title 标题，需自带结尾的冒号，例如 '获取新消息时出错：'
 * @param {{ message?: string, code?: number }} json B 站接口返回的 JSON（或任何带 message、code 的对象）；没有 code 时不输出括号
 * @param {string} [suffix] 追加在末尾的文本
 */
export const logError = (title, { message, code } = {}, suffix = '') => {
  console.error(`${timestamp()} ${style(['bold', 'redBright'], title)}${style('whiteBright', message)}${code === undefined ? '' : `（${style('redBright', code)}）`}${suffix}`);
};
