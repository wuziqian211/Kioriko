/**
 * 命令 “关系”：查询用户与自己的关注关系
 */

import { getDate } from '../../utils/format.js';
import { getUserRelation, getUserRelationTags } from '../../api/relation.js';

export default {
  names: ['关系', '查关系', '查询关系', '获取关系'],
  async run({ senderUid, autoReplyFn }) {
    const relation = await getUserRelation(senderUid, false);
    if (relation) {
      autoReplyFn([{ msgType: 1, content: { content: `您与梦春酱的关系：
梦春酱${relation.relation.attribute === 1 ? '悄悄关注了您[tv_微笑]' : [2, 6].includes(relation.relation.attribute) ? relation.relation.special ? '特别关注了您，看来您对梦春酱来说特别重要[tv_微笑]' : '关注了您[tv_微笑]' : '没有关注您 (´；ω；`)'}${relation.relation.tag?.some(g => g !== -10) ? `（关注分组：${[...(await getUserRelationTags(senderUid)).values()].join('、')}；关注时间：${getDate(relation.relation.mtime * 1000)}）` : relation.relation.tag?.includes(-10) ? `（关注分组：特别关注；关注时间：${getDate(relation.relation.mtime * 1000)}）` : [1, 2, 6].includes(relation.relation.attribute) ? `（关注分组：默认分组；关注时间：${getDate(relation.relation.mtime * 1000)}）` : ''}
您${relation.be_relation.attribute === 1 ? '悄悄关注了梦春酱，不要那么隐蔽好不好，我都发现您了[tv_微笑]' : [2, 6].includes(relation.be_relation.attribute) ? relation.be_relation.special ? '特别关注了梦春酱，感谢您对梦春酱的支持[tv_微笑]' : '关注了梦春酱[tv_微笑]' : '没有关注梦春酱 (´；ω；`)'}${relation.be_relation.tag?.some(g => g !== -10) ? `（关注分组 ID：${relation.be_relation.tag.filter(g => g !== -10).join('、')}，梦春酱无法知道分组的具体名称；关注时间：${getDate(relation.be_relation.mtime * 1000)}）` : relation.be_relation.tag?.includes(-10) ? `（关注分组：特别关注；关注时间：${getDate(relation.be_relation.mtime * 1000)}）` : [1, 2, 6].includes(relation.be_relation.attribute) ? `（关注分组：默认分组；关注时间：${getDate(relation.be_relation.mtime * 1000)}）` : ''}` } }]);
    } else {
      autoReplyFn([{ msgType: 1, content: { content: '获取用户关系失败，请稍后重试哟 qwq' } }]);
    }
  },
};
