/**
 * 根据昵称查找用户（“获取信息”“注册时间”“查成分” 共用）
 */

import { getNumber } from '../utils/format.js';
import { searchUsers } from '../api/user.js';

/**
 * 根据昵称查找用户的 UID（不区分大小写，必须完全一致）
 * 找不到时会自动回复提示（有相近的用户时会列出来），并返回 null
 * @param {string} name 用户昵称
 * @param {string} purpose 查询的内容，用于提示文本 “您是不是想获取下列用户的{purpose}”，例如 '信息'、'注册时间'
 * @param {Function} autoReplyFn 自动回复函数
 * @returns {Promise<number | null>} 用户的 UID
 */
export const resolveUser = async (name, purpose, autoReplyFn) => {
  const foundUsers = await searchUsers(name);
  if (!foundUsers?.length) {
    autoReplyFn([{ msgType: 1, content: { content: '没有找到这个用户，您是不是应该检查一下这个用户的昵称是否输入正确呢[tv_疑问]' } }]);
    return null;
  }

  const user = foundUsers.find(u => u.name.toUpperCase() === name.toUpperCase());
  if (user) return +user.uid;

  autoReplyFn([{ msgType: 1, content: { content: `没有找到这个用户，您是不是应该检查一下这个用户的昵称是否输入正确与完整呢[tv_疑问]\n您是不是想获取下列用户的${purpose}：\n${foundUsers.map(u => `${u.name}（UID：${u.uid}；粉丝数：${getNumber(u.fans)}${u.official_verify_type === 0 ? '；UP 主认证' : u.official_verify_type === 1 ? '；机构认证' : ''}）`).join('\n')}` } }]);
  return null;
};
