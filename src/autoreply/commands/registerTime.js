/**
 * 命令 “注册时间”：根据默认收藏夹的创建时间推测注册时间
 */

import { getDate } from '../../utils/format.js';
import { idParser } from '../../utils/id.js';
import { callAPI } from '../../api/client.js';
import { resolveUser } from '../resolveUser.js';

export default {
  names: ['注册时间'],
  async run({ senderUid, args, autoReplyFn }) {
    let { id, name } = idParser(args[1], '1', true);
    if (name) {
      id = await resolveUser(name, '注册时间', autoReplyFn);
      if (id === null) return;
    }
    id ??= senderUid;

    const fjson = await callAPI('https://api.bilibili.com/x/v3/fav/folder/created/list-all',
      { params: { up_mid: id, type: 2, web_location: '333.1387' } });
    if (fjson.code === 0) {
      const defaultFavFolder = fjson.data?.list?.find(f => (f.attr & (1 << 1)) === 0);
      if (defaultFavFolder) {
        const ijson = await callAPI('https://api.bilibili.com/x/v3/fav/folder/info',
          { params: { media_id: defaultFavFolder.id, web_location: '333.1387' } });
        if (ijson.code === 0) {
          autoReplyFn([{ msgType: 1, content: { content: `注册时间：${getDate(ijson.data.ctime * 1000)}\n（从默认收藏夹的创建时间获取，可能比注册时间稍晚）` } }]);
        } else {
          autoReplyFn([{ msgType: 1, content: { content: '获取注册时间失败，请稍后重试哟 qwq' } }]);
        }
      } else {
        autoReplyFn([{ msgType: 1, content: { content: '只有公开了默认收藏夹，才能获取注册时间哟 (っ °Д °;)っ\n（注：需要同时公开收藏列表与默认收藏夹本身）' } }]);
      }
    } else {
      autoReplyFn([{ msgType: 1, content: { content: '获取注册时间失败，请稍后重试哟 qwq' } }]);
    }
  },
};
