/**
 * 账号操作：充电与批量点赞动态
 */

import { getDate } from '../utils/format.js';
import { style } from '../utils/color.js';
import { JSONStringify } from '../utils/json.js';
import { wait } from '../utils/misc.js';
import { logError } from '../utils/log.js';
import { callAPI } from './client.js';
import { getUserInfo } from './user.js';

export const charge = async (mid, amount, message = '', signal) => { // 给指定用户充电
  const { promise, resolve, reject } = Promise.withResolvers();

  if (signal instanceof AbortSignal) {
    signal.throwIfAborted();
    signal.addEventListener('abort', () => reject(signal.reason));
    return promise;
  }

  const cjson = await callAPI('https://api.bilibili.com/x/ugcpay/web/v2/trade/elec/pay/qr_code/create',
    { method: 'POST', body: new URLSearchParams({ bp_num: amount, is_bp_remains_prior: false, up_mid: mid, otype: 'up', oid: mid }), requiredKeys: ['code', 'data'] }); // 创建支付订单
  if (cjson.code === 0) {
    const info = await getUserInfo(mid);
    console.log(`${style('gray', `[${getDate(Date.now())}]`)} 给 ${info ? style('cyanBright', info.name) : `UID ${style('yellowBright', mid)}`} 充电 ${style('whiteBright', amount)} B 币\n请用支付软件打开以下链接：${style(['underline', 'whiteBright'], cjson.data.qr_code_url)}，若充电成功可获得 ${style('greenBright', cjson.data.exp)} 经验`);

    let sjson;
    do { // 检查支付状态
      await wait(1000);
      if (signal instanceof AbortSignal && signal.aborted) return promise;
      sjson = await callAPI('https://api.bilibili.com/x/ugcpay/trade/elec/pay/order/status',
        { params: { qr_token: cjson.data.qr_token }, signal });
    } while (sjson.code === 0 && sjson.data.status !== 1); // 在支付成功前一直循环

    if (sjson.code === 0) {
      const mjson = await callAPI('https://api.bilibili.com/x/ugcpay/trade/elec/message',
        { method: 'POST', body: new URLSearchParams({ order_id: sjson.data.order_no, message }) }); // 发送充电消息
      if (mjson.code === 0) console.log(`${style('gray', `[${getDate(Date.now())}]`)} 给 ${info ? style('cyanBright', info.name) : `UID ${style('yellowBright', mid)}`} 充电${style('greenBright', '成功')}！`);
      resolve(true);
    } else {
      logError(`给 UID ${mid} 充电时出错：`, sjson);
      resolve(false);
    }
  } else {
    logError(`给 UID ${mid} 创建充电时出错：`, cjson);
    resolve(false);
  }
  return promise;
};
export const likeUserDynamics = async (mid, signal) => { // 点赞指定用户的动态
  const dynamics = [], info = await getUserInfo(mid);
  let done;
  const [, count] = await Promise.all([
    (async () => { // 获取用户动态
      let djson;
      while (true) {
        if (signal instanceof AbortSignal && signal.aborted) break;
        djson = await callAPI('https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space',
          { params: { offset: djson ? djson.data.offset : '', host_mid: mid, timezone_offset: -480, features: 'itemOpusStyle,listOnlyfans,opusBigCover,onlyfansVote,forwardListHidden,decorationCard,commentsNewVersion,onlyfansAssetsV2,ugcDelete,onlyfansQaCard', web_location: '333.1387' }, wbiSign: true }); // 获取用户动态列表
        if (djson.code === 0) {
          if (djson.data.items?.length) {
            dynamics.push(...djson.data.items.filter(({ modules: { module_stat: { like } } }) => !like.forbidden && !like.status).map(d => ({ id: d.id_str }))); // 添加没有点赞的动态 ID 到数组
          }
          if (!djson.data.offset) { // 没有更早的动态
            console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${info ? style('cyanBright', info.name) : `UID ${style('yellowBright', mid)}`} 的动态已全部获取完成`);
            break;
          }
        } else {
          logError(`获取 UID ${mid} 的动态时出错：`, djson);
          break;
        }
        await wait(1000 + Math.random() * 4000);
      }
      done = true;
    })(),
    (async () => { // 点赞用户动态
      let i = 0;
      while (!done || i < dynamics.length) {
        await wait(1000);
        while (i < dynamics.length) {
          if (signal instanceof AbortSignal && signal.aborted) break;
          const ljson = await callAPI('https://api.bilibili.com/x/dynamic/feed/dyn/thumb',
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSONStringify({ dyn_id_str: dynamics[i].id, up: 1 }) });
          dynamics[i].done = true; // 执行了点赞操作
          if (ljson.code === 0) {
            dynamics[i].success = true; // 点赞成功
            console.log(`${style('gray', `[${getDate(Date.now())}]`)} ${style('greenBright', '已点赞')}动态 ${style('whiteBright', dynamics[i].id)}（${style('yellowBright', dynamics.filter(d => d.done).length)} / ${style('cyanBright', dynamics.length)}）`);
          } else {
            logError(`点赞 ID 为 ${dynamics[i].id} 的动态时出错：`, ljson);
          }
          i++;
          await wait(800 + Math.random() * 3000);
        }
        if (signal instanceof AbortSignal && signal.aborted) break;
      }
      console.log(`${style('gray', `[${getDate(Date.now())}]`)} 点赞完成，成功点赞 ${info ? style('cyanBright', info.name) : `UID ${style('yellowBright', mid)}`} 的 ${style('cyanBright', dynamics.filter(d => d.success).length)} 条动态，共 ${style('yellowBright', dynamics.length)} 条动态`);
      return dynamics.filter(d => d.success).length;
    })(),
  ]);
  return count;
};
