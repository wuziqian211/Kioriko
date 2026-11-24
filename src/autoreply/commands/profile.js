/**
 * 命令 “查成分”：用户名片信息与动态关键词
 */

import { getNumber, longTextHandler } from '../../utils/format.js';
import { idParser } from '../../utils/id.js';
import { callAPI } from '../../api/client.js';
import { getUserCard } from '../../api/user.js';
import { resolveUser } from '../resolveUser.js';

export default {
  names: ['查成分'],
  async run({ senderUid, selfMid, args, autoReplyFn }) {
    let { id, name } = idParser(args[1], '1', true);
    if (name) {
      id = await resolveUser(name, '成分', autoReplyFn);
      if (id === null) return;
    }
    id ??= senderUid;

    const card = await getUserCard(id, true);
    if (card) {
      const djson = await callAPI('https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history',
        { params: { visitor_uid: selfMid, host_uid: id, need_top: 1 } });
      let extraText = ' ';
      if (djson.code === 0 && djson.data.cards?.length) {
        const topics = [
          { name: '原批', keywords: ['原神'] },
          { name: '农批', keywords: ['王者荣耀'] },
          { name: '粥批', keywords: ['明日方舟'] },
          { name: '虾爬子', keywords: ['肖战'] },
        ];
        const foundTopic = topics.find(({ keywords }) => djson.data.cards.some(c => keywords.some(k => c.card.includes(k))));
        if (foundTopic) extraText = `（${foundTopic.name}）`;
      }
      autoReplyFn([{ msgType: 1, content: { content: `${card.name}${extraText}的成分：
${card.name} Lv${card.is_senior_member ? '6⚡' : card.level_info.current_level}${[0, 1].includes(card.Official.type) ? `\n⚡bilibili ${card.Official.type === 0 ? 'UP 主' : '机构'}认证：${card.Official.title}` : ''}${card.spacesta === -2 ? '\nTA 已经被封禁了哟 qwq' : ''}
${getNumber(card.attention)} 关注 ${getNumber(card.fans)} 粉丝
性别：${card.sex}
个性签名：${longTextHandler(card.sign)}` } }]);
    } else {
      autoReplyFn([{ msgType: 1, content: { content: '嗯……您查询的用户不存在哟 qwq' } }]);
    }
  },
};
