/**
 * 终端着色：真彩色降级、styleText 封装与 B 站表情着色
 */

import util from 'node:util';
import { closest } from 'color-diff'; // 获取最接近的颜色

export const trueColorToSupportedColor = (trueColor, isBackground) => { // 将真彩色转换成终端支持的颜色
  let R, G, B;
  if (typeof trueColor === 'string' && /^#[\da-f]{6}$/i.test(trueColor)) { // #RRGGBB 颜色格式
    R = parseInt(trueColor.slice(1, 3), 16);
    G = parseInt(trueColor.slice(3, 5), 16);
    B = parseInt(trueColor.slice(5), 16);
  } else if (typeof trueColor === 'string' && /^#[\da-f]{3}$/i.test(trueColor)) { // #RGB 颜色格式
    R = parseInt(trueColor[1], 16) * 17;
    G = parseInt(trueColor[2], 16) * 17;
    B = parseInt(trueColor[3], 16) * 17;
  } else if (typeof trueColor === 'number') { // 纯数字颜色格式
    R = trueColor >> 16 & 255;
    G = trueColor >> 8 & 255;
    B = trueColor & 255;
  } else {
    return ['', ''];
  }

  const colorDepth = process.stdout.getColorDepth();
  if (colorDepth >= 24) { // 终端支持真彩色（16777216 种颜色）
    return [`\x1b[${isBackground ? 48 : 38};2;${R};${G};${B}m`, `\x1b[${isBackground ? 49 : 39}m`];
  } else if (colorDepth >= 4) { // 终端支持基本颜色（即 16 色；如果终端支持 256 色此条件也成立）
    const supportedColors = [ // 基本颜色表
      { R: 0, G: 0, B: 0 }, { R: 170, G: 0, B: 0 }, { R: 0, G: 170, B: 0 }, { R: 170, G: 85, B: 0 },
      { R: 0, G: 0, B: 170 }, { R: 170, G: 0, B: 170 }, { R: 0, G: 170, B: 170 }, { R: 170, G: 170, B: 170 },
      { R: 85, G: 85, B: 85 }, { R: 255, G: 85, B: 85 }, { R: 85, G: 255, B: 85 }, { R: 255, G: 255, B: 85 },
      { R: 85, G: 85, B: 255 }, { R: 255, G: 85, B: 255 }, { R: 85, G: 255, B: 255 }, { R: 255, G: 255, B: 255 },
    ];

    if (colorDepth >= 8) { // 终端支持 256 色
      // 1. 256 色表中索引为 0~15 的颜色的索引同基本颜色的索引

      // 2. 256 色表中索引为 16~231 的颜色
      for (let r = 0; r < 6; r++) {
        for (let g = 0; g < 6; g++) {
          for (let b = 0; b < 6; b++) {
            supportedColors.push({ R: r && 55 + r * 40, G: g && 55 + g * 40, B: b && 55 + b * 40 });
          }
        }
      }

      // 3. 256 色表中索引为 232~255 的颜色为灰度颜色
      for (let i = 8; i <= 238; i += 10) {
        supportedColors.push({ R: i, G: i, B: i });
      }
    }

    const closestColor = closest({ R, G, B }, supportedColors); // 获取最接近的颜色
    const index = supportedColors.findIndex(color => color.R === closestColor.R && color.G === closestColor.G && color.B === closestColor.B); // 获取最接近的颜色的索引
    return [`\x1b[${isBackground ? 48 : 38};5;${index}m`, `\x1b[${isBackground ? 49 : 39}m`];
  } else {
    return ['', ''];
  }
};
export const style = (format, text, options) => util.styleText(format, `${text}`, options);
export const colorEmote = text => { // 为 B 站表情着色
  if (typeof text !== 'string') return '';
  const components = [{ content: text }];
  for (let i = 0; i < components.length; i++) { // 由于下面的代码可能会导致 components 的元素变化，为确保能遍历每一个需要遍历的元素，此处不能使用 for (const c of components)
    const { content } = components[i], result = /\[[^[\]\s]+\]/.exec(content);
    if (result) {
      const [match] = result, { index } = result;
      components.splice(i++, 0, { content: content.slice(0, index) }); // 在该组成部分前插入一个内容为匹配文本之前的文本的组成部分
      components[i].content = match;
      components[i].type = 'emote';
      components.splice(i + 1, 0, { content: content.slice(index + match.length) }); // 在该组成部分后插入一个内容为匹配文本之后的文本的组成部分
    }
  }
  return components.map(c => style(c.type === 'emote' ? ['underline', 'yellowBright'] : 'whiteBright', c.content)).join('');
};
