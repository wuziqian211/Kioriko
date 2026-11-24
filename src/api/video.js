/**
 * 视频：视频信息与详细信息
 */

import { toBV } from '../utils/id.js';
import { logError } from '../utils/log.js';
import { updatedTimestampSymbol, getCache, setCache } from '../core/cache.js';
import { callAPI } from './client.js';

export const getVideoInfo = async (bvid, noCache) => { // 获取视频信息
  if (['number', 'bigint'].includes(typeof bvid)) bvid = toBV(bvid);
  let video;
  if (!noCache) video = getCache('Video', bvid);
  if (!video || Date.now() - video[updatedTimestampSymbol] >= 300000) {
    const vjson = await callAPI('https://api.bilibili.com/x/web-interface/wbi/view',
      { params: { bvid, web_location: 1446382 }, wbiSign: true });
    if (vjson.code === 0) {
      setCache('Video', bvid, vjson.data);
      return vjson.data;
    } else {
      logError(`获取 ${bvid} 的信息时出错：`, vjson);
      return video ?? null;
    }
  } else {
    return video;
  }
};
export const getVideoDetail = async (bvid, noCache) => { // 获取视频详细信息
  if (['number', 'bigint'].includes(typeof bvid)) bvid = toBV(bvid);
  let video;
  if (!noCache) video = getCache('VideoDetail', bvid);
  if (!video || Date.now() - video[updatedTimestampSymbol] >= 300000) {
    const vjson = await callAPI('https://api.bilibili.com/x/web-interface/wbi/view/detail',
      { params: { bvid, need_operation_card: 1, web_rm_repeat: 1, need_elec: 1, out_referer: 'https://www.bilibili.com/', page_no: 1, p: 1, web_location: 1446382 }, wbiSign: true });
    if (vjson.code === 0) {
      setCache('VideoDetail', bvid, vjson.data);
      setCache('Video', bvid, vjson.data.View);
      return vjson.data;
    } else {
      logError(`获取 ${bvid} 的信息时出错：`, vjson);
      return video ?? null;
    }
  } else {
    return video;
  }
};
