/**
 * 编号：AV 号与 BV 号互转、解析用户输入的编号类型
 */

export const toBV = aid => { // AV 号转 BV 号，改编自 https://www.zhihu.com/question/381784377/answer/1099438784、https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/bvid_desc.md
  const xorCode = 23442827791579n, maxAid = 1n << 51n,
        alphabet = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf',
        encodeMap = [8, 7, 0, 5, 1, 3, 2, 4, 6], bvid = [], base = BigInt(alphabet.length);
  let t = (maxAid | BigInt(aid)) ^ xorCode;
  for (const n of encodeMap) {
    bvid[n] = alphabet[t % base];
    t /= base;
  }
  return `BV1${bvid.join('')}`;
};
export const toAV = bvid => { // BV 号转 AV 号，改编自 https://www.zhihu.com/question/381784377/answer/1099438784、https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/bvid_desc.md
  if (!/^[Bb][Vv]1[1-9A-HJ-NP-Za-km-z]{9}$/.test(bvid)) throw new TypeError('Invalid BV number');
  const xorCode = 23442827791579n, maskCode = (1n << 51n) - 1n,
        alphabet = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf',
        decodeMap = [6, 4, 2, 3, 1, 5, 0, 7, 8], base = BigInt(alphabet.length);
  let t = 0n;
  for (const n of decodeMap) {
    const index = BigInt(alphabet.indexOf(bvid[n + 3]));
    t = t * base + index;
  }
  return (t & maskCode) ^ xorCode;
};
export const idParser = (id, pureNumberAsking, onlyUser) => { // 判断编号类型
  if (typeof id !== 'string' || !id) return { type: null };
  if (/^".+"$/.test(id)) { // 若编号前后加了英文双引号，则视为用户昵称
    return { type: 0, name: id.replace(/^"(?<name>.+)"$/, '$1') };
  } else if (/^(?:uid|mid)\d+$/i.test(id) && BigInt(id.slice(3)) > 0) { // 判断编号是否为前缀为 “uid” 或 “mid” 的 UID
    return { type: 0, id: BigInt(id.slice(3)) };
  } else if (!onlyUser && /^av\d+$/i.test(id) && BigInt(id.slice(2)) > 0) { // 判断编号是否为前缀为 “av” 的 AV 号
    return { type: 1, id: toBV(id.slice(2)) };
  } else if (/^\d+$/.test(id) && BigInt(id) > 0) { // 判断编号是否为纯数字
    switch (onlyUser ? '1' : typeof pureNumberAsking === 'string' ? pureNumberAsking.trim() : pureNumberAsking) {
      case '1': // 视为 UID
        return { type: 0, id: BigInt(id) };
      case '2': // 视为用户昵称
        return { type: 0, name: id };
      case '3': // 视为 AV 号
        return { type: 1, id: toBV(id) };
      case '4': // 视为 mdid
        return { type: 2, id: BigInt(id) };
      case '5': // 视为 ssid
        return { type: 3, id: BigInt(id) };
      case '6': // 视为 epid
        return { type: 4, id: BigInt(id) };
      case true: // 询问用户
        return { type: -1, id };
      default: // 无效
        return { type: null };
    }
  } else if (!onlyUser && /^[Bb][Vv]1[1-9A-HJ-NP-Za-km-z]{9}$/.test(id)) { // 判断编号是否为 BV 号
    return { type: 1, id: `BV${id.slice(2)}` };
  } else if (!onlyUser && /^md\d+$/i.test(id) && BigInt(id.slice(2)) > 0) { // 判断编号是否为 mdid
    return { type: 2, id: BigInt(id.slice(2)) };
  } else if (!onlyUser && /^ss\d+$/i.test(id) && BigInt(id.slice(2)) > 0) { // 判断编号是否为 ssid
    return { type: 3, id: BigInt(id.slice(2)) };
  } else if (!onlyUser && /^ep\d+$/i.test(id) && BigInt(id.slice(2)) > 0) { // 判断编号是否为 epid
    return { type: 4, id: BigInt(id.slice(2)) };
  } else { // 以上条件都不满足，视为用户昵称
    return { type: 0, name: id };
  }
};
