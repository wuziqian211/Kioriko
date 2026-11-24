/**
 * 命令：回复固定内容（中考成绩、帮助菜单、关于）
 */

export const examScore = {
  names: ['中考成绩'],
  async run({ autoReplyFn }) {
    autoReplyFn([{ msgType: 1, content: { content: '以下是梦春酱在 2023 年 6 月 20 日 ~ 2023 年 6 月 22 日期间参加的武汉市中考的具体成绩，仅供查看，请勿转发。' } }, { msgType: 2, content: { url: 'https://i0.hdslb.com/bfs/im_new/0c793dd015889a8d3b63808882a22b56425503913.jpg', height: 2249, width: 1628, imageType: 'png', original: 1, size: 817 } }]);
  },
};

export const help = {
  names: ['帮助', '菜单'],
  async run({ autoReplyFn }) {
    autoReplyFn([{ msgType: 2, content: { url: 'https://i0.hdslb.com/bfs/im_new/02abfb83a43218fdd01551bf8d360e69425503913.png', height: 2657, width: 1912, imageType: 'png', original: 1, size: 381.714 } }]);
  },
};

export const about = {
  names: ['关于', '版本'],
  async run({ autoReplyFn }) {
    autoReplyFn([{ msgType: 2, content: { url: 'https://i0.hdslb.com/bfs/im_new/58db9270b01997bf424e627651bc5088425503913.png', height: 500, width: 2657, imageType: 'png', original: 1, size: 112.625 } }]);
  },
};
