/**
 * 命令 “获取信息”：获取用户、视频、剧集或番剧的信息
 */

import { getCurrentTime } from '../../runtime.js';
import { videoZones, videoStates } from '../../constants.js';
import { getDate, getTime, getNumber, longTextHandler } from '../../utils/format.js';
import { wait } from '../../utils/misc.js';
import { toBV, toAV, idParser } from '../../utils/id.js';
import { callAPI } from '../../api/client.js';
import { getUserInfo, getUserCard } from '../../api/user.js';
import { getVideoInfo } from '../../api/video.js';
import { fetchImageMeta } from '../../api/image.js';
import { cancelWaiting, waitForReply } from '../waiting.js';
import { resolveUser } from '../resolveUser.js';

const replyUser = async (id, name, autoReplyFn) => { // 回复用户信息；只提供了昵称时先根据昵称查找 UID
  if (name) {
    id = await resolveUser(name, '信息', autoReplyFn);
    if (id === null) return;
  }

  const [card, info] = await Promise.all([getUserCard(id, true), getUserInfo(id, true)]);
  if (card) {
    const data = { ...card, level: card.level_info.current_level, silence: +(card.spacesta === -2), official: card.Official };
    if (info) {
      Object.assign(data, info);
    }
    const image = await fetchImageMeta(data.face);
    autoReplyFn([
      { msgType: 1, content: { content: `${data.name}${data.sex === '男' ? ' ♂️' : data.sex === '女' ? ' ♀️' : ''} Lv${data.is_senior_member ? '6⚡' : data.level} https://space.bilibili.com/${id}
${[0, 1].includes(data.official.type) ? `⚡bilibili ${data.official.type === 0 ? 'UP 主' : '机构'}认证：${data.official.title}${data.official.desc ? `（${data.official.desc}）` : ''}\n` : ''}${data.silence ? '⚠️该账号封禁中\n' : ''}${data.sys_notice?.content ? `${data.sys_notice.notice_type === 2 ? '🕯️' : '⚠️'}${data.sys_notice.content}${data.sys_notice.url ? `（详情：${data.sys_notice.url}）` : ''}\n` : ''}生日：${data.birthday || '保密'}
${data.tags?.length ? `标签：${data.tags.join(' ')}\n` : ''}${data.school?.name ? `学校：${data.school.name}\n` : ''}关注数：${getNumber(data.attention)}
粉丝数：${getNumber(data.fans)}
个性签名：${longTextHandler(data.sign)}` } },
      { msgType: 2, content: image },
    ]);
  } else {
    autoReplyFn([{ msgType: 1, content: { content: '嗯……这个用户好像不存在呢 (´；ω；`)' } }]);
  }
};

const replyVideo = async (id, autoReplyFn) => { // 回复视频信息（id 为 BV 号）；视频不可见时尝试通过历史记录获取
  let data, isFromHistory;
  const videoInfo = await getVideoInfo(id, true);
  if (videoInfo) {
    data = videoInfo;
  } else {
    await callAPI('https://api.bilibili.com/x/click-interface/web/heartbeat',
      { method: 'POST', body: new URLSearchParams({ bvid: id, played_time: 0, realtime: 0, start_ts: Math.floor(getCurrentTime() / 1000), type: 3, sub_type: 0, dt: 2, play_type: 1 }) }); // 在 B 站历史记录首次加入这个视频（可不带 cid）
    await wait(500); // 等待 0.5 秒
    const hjson1 = await callAPI('https://api.bilibili.com/x/v2/history', { params: { pn: 1, ps: 30 } }); // 获取历史记录
    let info = hjson1.data?.find(h => h.type === 3 && h.bvid === id); // 获取 BV 号相同的视频信息
    if (hjson1.code === 0 && info) {
      isFromHistory = true;
      if (info.cid) {
        await callAPI('https://api.bilibili.com/x/v2/history/report',
          { method: 'POST', body: new URLSearchParams({ aid: toAV(id), cid: info.cid, progress: 0, platform: 'web' }) }); // 在 B 站历史记录再次加入这个视频（带 cid，此时可以获取更多信息）
        await wait(500); // 等待 0.5 秒
        const hjson2 = await callAPI('https://api.bilibili.com/x/v2/history', { params: { pn: 1, ps: 30 } }); // 获取历史记录
        const info2 = hjson2.data?.find(h => h.type === 3 && h.bvid === id); // 获取 BV 号相同的视频信息
        if (info2) info = info2;
      }
      data = { ...info, pages: [{ cid: info.page?.cid ?? info.cid, page: info.page?.page ?? 1, part: info.page?.part ?? '', duration: info.page?.duration ?? null, dimension: info.page?.dimension ?? info.dimension, first_frame: info.page?.first_frame ?? info.first_frame }] };
    }
  }

  if (data) {
    const image = await fetchImageMeta(data.pic);
    autoReplyFn([
      { msgType: 1, content: { content: `${isFromHistory ? '【警告】本视频不可见\n' : ''}${data.title}（av${data.aid}，${data.bvid}）${data.forward ? `（已与 ${toBV(data.forward)} 撞车）` : ''}
${data.state !== 0 ? `⚠️${videoStates.has(data.state) ? videoStates.get(data.state) : '该视频存在未知问题'}\n` : ''}${data.argue_info?.argue_msg ? `⚠️${data.argue_info.argue_msg}\n` : ''}${data.videos}P ${getTime(data.duration)} ${data.copyright === 1 ? '自制' : '转载'}${data.rights?.no_reprint ? '（未经作者授权，禁止转载）' : ''}${data.rights?.is_cooperation ? ' 合作' : ''}${data.rights?.is_stein_gate ? ' 互动' : ''}${data.rights?.is_360 ? ' 全景' : ''}${data.honor_reply?.honor?.some(h => h.type !== 3) ? ` ${data.honor_reply.honor.filter(h => h.type !== 3).map(h => h.desc).join(' ')}` : ''}${data.stat.evaluation ? ` ${data.stat.evaluation}` : ''}${data.stat.now_rank ? ` 当前排名第 ${data.stat.now_rank} 名` : ''}${data.stat.his_rank ? ` 历史最高排名第 ${data.stat.his_rank} 名` : ''}
分区：${videoZones.has(data.tid) ? videoZones.get(data.tid) : data.tname || '未知'}
${data.state === -40 ? '审核通过' : '投稿/审核通过'}时间：${getDate(data.ctime * 1000)}（可能不准确）
${data.state === -40 ? '投稿' : '发布'}时间：${getDate(data.pubdate * 1000)}
播放：${getNumber(data.stat.view)}
弹幕：${getNumber(data.stat.danmaku)}
评论：${getNumber(data.stat.reply)}
点赞：${getNumber(data.stat.like)}
投币：${getNumber(data.stat.coin)}
收藏：${getNumber(data.stat.favorite)}
分享：${getNumber(data.stat.share)}
${data.rights?.is_cooperation && data.staff ? `合作成员：
${data.staff.map(u => `${u.title}：${u.name}（粉丝数：${getNumber(u.follower)}） https://space.bilibili.com/${u.mid}`).join('\n')}\n` : data.owner.mid ? `UP 主：${data.owner.name} https://space.bilibili.com/${data.owner.mid}\n` : ''}${data.pages ? `${data.pages.map(p => `P${p.page}：${p.part}（cid：${p.cid || '未知'}） ${getTime(p.duration)}${p.dimension?.height && p.dimension?.width ? ` ${p.dimension.rotate ? `${p.dimension.height}×${p.dimension.width}` : `${p.dimension.width}×${p.dimension.height}`}` : ''}`).join('\n')}\n` : ''}${data.dynamic ? `同步发布动态的文字内容：${longTextHandler(data.dynamic)}\n` : ''}简介：${longTextHandler(data.desc)}` } },
      { msgType: 2, content: image },
    ]);
  } else {
    autoReplyFn([{ msgType: 1, content: { content: '嗯……这个视频好像不存在呢 (´；ω；`)' } }]);
  }
};

const replyMedia = async (id, autoReplyFn) => { // 回复剧集信息（id 为 mdid）
  const mjson = await callAPI('https://api.bilibili.com/pgc/review/user',
    { params: { media_id: id }, requiredKeys: ['code', 'result'] });
  if (mjson.code === 0) {
    const image = await fetchImageMeta(mjson.result.media.cover);
    autoReplyFn([
      { msgType: 1, content: { content: `${mjson.result.media.title} https://www.bilibili.com/bangumi/media/md${id}
${mjson.result.media.type_name} ${mjson.result.media.new_ep?.index_show ?? ''} ${mjson.result.media.areas.map(a => a.name).join('、')} ${mjson.result.media.rating ? `${mjson.result.media.rating.score ? `${mjson.result.media.rating.score.toFixed(1)} 分` : ''}（共 ${mjson.result.media.rating.count} 人评分）` : '暂无评分'}${mjson.result.media.new_ep?.id ? `
最新一话：${mjson.result.media.new_ep.index} https://www.bilibili.com/bangumi/play/ep${mjson.result.media.new_ep.id}` : ''}${mjson.result.media.season_id ? `
查看更多信息，请发送 “#获取信息 ss${mjson.result.media.season_id}”` : ''}` } },
      { msgType: 2, content: image },
    ]);
  } else {
    autoReplyFn([{ msgType: 1, content: { content: '嗯……这个剧集好像不存在呢 (´；ω；`)' } }]);
  }
};

const replySeason = async (type, id, autoReplyFn) => { // 回复番剧信息（type 为 3 时 id 为 ssid，为 4 时 id 为 epid）
  let notAvailableInChineseMainland,
      sjson = await callAPI('https://api.bilibili.com/pgc/view/web/season',
        { params: { [`${type === 3 ? 'season' : 'ep'}_id`]: id }, requiredKeys: ['code', 'result'] });
  if (sjson.code !== 0) {
    notAvailableInChineseMainland = true;
    sjson = await (await fetch(`https://api.yumeharu.top/api/getvideo?vid=${type === 3 ? 'ss' : 'ep'}${id}&type=json`)).json();
    sjson.result = sjson.data;
  }
  if (sjson.code === 0) {
    const image = await fetchImageMeta(sjson.result.cover);
    autoReplyFn([
      { msgType: 1, content: { content: `${notAvailableInChineseMainland ? '【警告】本番剧在中国大陆不可见\n' : ''}${sjson.result.title} https://www.bilibili.com/bangumi/play/${type === 3 ? 'ss' : 'ep'}${id}
${sjson.result.type === 1 ? '番剧' : sjson.result.type === 2 ? '电影' : sjson.result.type === 3 ? '纪录片' : sjson.result.type === 4 ? '国创' : sjson.result.type === 5 ? '电视剧' : sjson.result.type === 7 ? '综艺' : ''}${sjson.result.total === -1 ? '' : ` 已完结，共 ${sjson.result.total} 集`} ${sjson.result.areas.map(a => a.name).join('、')} ${sjson.result.rating?.score ? `${sjson.result.rating.score.toFixed(1)} 分（共 ${sjson.result.rating.count} 人评分）` : '暂无评分'}
发布时间：${sjson.result.publish.pub_time}
播放量：${getNumber(sjson.result.stat.views)}
弹幕数：${getNumber(sjson.result.stat.danmakus)}
评论数：${getNumber(sjson.result.stat.reply)}
点赞数：${getNumber(sjson.result.stat.likes)}
投币数：${getNumber(sjson.result.stat.coins)}
收藏数：${getNumber(sjson.result.stat.favorites)}
分享数：${getNumber(sjson.result.stat.share)}
${sjson.result.up_info ? `UP 主：${sjson.result.up_info.uname}（粉丝数：${getNumber(sjson.result.up_info.follower)}；https://space.bilibili.com/${sjson.result.up_info.mid}）
` : ''}正片：
${sjson.result.episodes.map(p => `${p.title} ${p.long_title}（${p.bvid}，ep${p.id}；cid：${p.cid}；发布时间：${getDate(p.pub_time * 1000)}） ${getTime(p.duration / 1000)}`).join('\n')}
${sjson.result.section ? `${sjson.result.section.map(s => `${s.title}：
${s.episodes.map(p => `${p.title} ${p.long_title ?? ''}${p.status === 0 ? `（${p.link.slice(p.link.lastIndexOf('/') + 1)}）` : `（${p.bvid}，ep${p.id}；cid：${p.cid}；发布时间：${getDate(p.pub_time * 1000)}） ${getTime(p.duration / 1000)}`}`).join('\n')}`).join('\n')}
` : ''}简介：${longTextHandler(sjson.result.evaluate)}` } },
      { msgType: 2, content: image },
    ]);
  } else {
    autoReplyFn([{ msgType: 1, content: { content: '嗯……这个番剧好像不存在呢 (´；ω；`)' } }]);
  }
};

export default {
  names: ['获取信息'],
  async run({ talkerId, sessionType, senderUid, selfMid, repliedMessageKey, args, autoReplyFn }) {
    cancelWaiting(state => state.talkerId === talkerId && state.sessionType === sessionType && state.senderUid === senderUid); // 取消该用户之前还在等待选择的 “获取信息”
    let { type, id, name } = idParser(args[1], true);

    if (type === -1) { // 用户提供的参数为纯数字，需要询问用户
      autoReplyFn([{ msgType: 1, content: { content: `您提供的参数为纯数字，请在 30 秒内回复序号（如 “1”）或命令以选择获取信息的类型：
1. 获取 UID 为 ${id} 的用户的信息（#获取信息 uid${id}）
2. 获取昵称为 “${id}” 的用户的信息（#获取信息 "${id}"）
3. 获取 AV 号为 ${id} 的视频的信息（#获取信息 av${id}）
4. 获取 MD 号为 ${id} 的剧集的信息（#获取信息 md${id}）
5. 获取 SS 号为 ${id} 的番剧的信息（#获取信息 ss${id}）
6. 获取 EP 号为 ${id} 的番剧的信息（#获取信息 ep${id}）` } }]);
      ({ type, id, name } = await waitForReply({
        talkerId, sessionType, senderUid, repliedMessageKey, selfMid,
        timeout: 32000,
        parse: text => { // 用户回复了序号，就按序号重新解析参数
          if (!/^\d+$/.test(text)) return null;
          const result = idParser(args[1], text);
          return result.type === null ? null : result;
        },
        onTimeout: async () => {
          await autoReplyFn([{ msgType: 1, content: { content: '等待时间太长了！梦春酱帮您选择根据 UID 获取用户信息' } }]);
          return { type: 0, id }; // 返回默认数据
        },
      }));
    }

    switch (type) {
      case 0: // 获取用户信息
        return replyUser(id, name, autoReplyFn);
      case 1: // 获取视频信息
        return replyVideo(id, autoReplyFn);
      case 2: // 获取剧集信息（编号为 mdid）
        return replyMedia(id, autoReplyFn);
      case 3: // 获取番剧信息（编号为 ssid）
      case 4: // 编号为 epid
        return replySeason(type, id, autoReplyFn);
      default: {
        autoReplyFn([{ msgType: 1, content: { content: '您还没有提供用户 UID 或完整昵称，视频 AV 或 BV 号，剧集 MD 号，或者番剧 SS 或 EP 号哟 qwq\n请发送 “#帮助” 以获取更多帮助哟 awa' } }]);
      }
    }
  },
};
