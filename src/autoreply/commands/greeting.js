/**
 * 命令 “你好”：打招呼
 */

import { getUserCard } from '../../api/user.js';

export default {
  names: ['你好', '您好'],
  async run({ senderUid, autoReplyFn }) {
    const extraTexts = ['您有什么事情或者问题，都可以对我说的呀[tv_微笑]我会热情为您服务的 awa[tv_微笑]', '请问您有什么问题呀 awa，可以跟我说的，我会尽快回复您的问题的[tv_微笑]'],
          { name } = await getUserCard(senderUid);
    autoReplyFn([{ msgType: 1, content: { content: `您好呀，${name}[tv_微笑]\n${extraTexts[Math.floor(Math.random() * extraTexts.length)]}` } }]);
  },
};
