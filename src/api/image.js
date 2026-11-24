/**
 * 图片：读取图片信息与上传图片
 */

import fs from 'node:fs/promises';
import sizeOf from 'image-size'; // 获取图片大小
import { getDate } from '../utils/format.js';
import { style } from '../utils/color.js';
import { logError } from '../utils/log.js';
import { headers, callAPI } from './client.js';

export const fetchImageMeta = async url => { // 下载图片并读取尺寸、格式与大小，返回值可直接作为图片消息（msgType 为 2）的 content
  const urlObj = new URL(url, 'https://i0.hdslb.com/');
  const img = Buffer.from(await (await fetch(urlObj, { headers })).arrayBuffer());
  const { height, width, type: imageType } = sizeOf(img);
  return { url: urlObj.href, height, width, imageType, original: 1, size: img.length / 1024 }; // size 的单位为 KB
};
export const uploadImage = async (file, biz = 'im' /* 或 'new_dyn' */) => { // 上传图片到 B 站服务器
  const fd = new FormData();
  fd.set('file_up', new Blob([Buffer.isBuffer(file) ? file : await fs.readFile(file)]));
  fd.set('biz', biz);
  if (biz === 'new_dyn') fd.set('category', 'daily');
  const ujson = await callAPI('https://api.bilibili.com/x/dynamic/feed/draw/upload_bfs',
    { method: 'POST', body: fd, requiredKeys: ['code', 'data'] });
  if (ujson.code === 0) {
    console.log(`${style('gray', `[${getDate(Date.now())}]`)} 上传了一张图片：${style(['underline', 'whiteBright'], ujson.data.image_url)}（${ujson.data.image_width}×${ujson.data.image_height}，${ujson.data.img_size} KB）`);
  } else {
    logError('上传图片时出错：', ujson);
  }
  return ujson;
};
