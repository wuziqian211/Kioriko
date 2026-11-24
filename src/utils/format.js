/**
 * 格式化：日期时间、时长、数字、长文本与字符串模板
 */

export const getDate = ts => { // 根据时间戳返回日期时间
  if (typeof ts !== 'number' || ts === 0) return '未知';
  const d = new Date(ts + (new Date().getTimezoneOffset() + 480) * 60000);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};
export const getTime = s => typeof s === 'number' ? `${s >= 3600 ? `${Math.floor(s / 3600)}:` : ''}${Math.floor(s % 3600 / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}` : ''; // 根据秒数返回时、分、秒
export const getNumber = n => ['number', 'bigint'].includes(typeof n) && n >= 0
  ? n >= 100000000 ? `${Number(n) / 100000000} 亿` : n >= 10000 ? `${Number(n) / 10000} 万` : `${n}` : '-';
export const longTextHandler = text => typeof text === 'string' && text.includes('\n') && !text.startsWith('\n') ? `\n${text}` : text; // 长文本处理，若文本中包含换行符且开头不为换行符，就在文本开头加上换行符
export const formatString = (template, data) => typeof template === 'string' ? template.replace(/\{(?<key>\w+)\}/g, (substr, key) => key in data ? data[key] : substr) : template; // 格式化字符串
