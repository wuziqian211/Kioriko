/**
 * JSON 解析与序列化（支持 BigInt）
 */

export const JSONParse = text => { // 解析 JSON（过大或过小的数字将会被转换成 BigInt 或文本）
  if (typeof text !== 'string') return text;
  return JSON.parse(
    text,
    (key, value, { source }) => typeof value === 'number' && (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER)
      ? /^-?(?:[1-9]\d*|0)$/.test(source) ? BigInt(source) : source
      : value,
  );
};
export const JSONStringify = (valueArg, space) => JSON.stringify(valueArg, (key, value) => typeof value === 'bigint' ? JSON.rawJSON(value) : value, space); // 序列化 JSON（BigInt 将会被转换成数字）
