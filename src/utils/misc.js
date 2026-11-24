/**
 * 杂项：执行命令、等待与原地过滤数组
 */

import util from 'node:util';
import child_process from 'node:child_process';

export const exec = util.promisify(child_process.exec);
export const wait = timeout => new Promise(resolve => { setTimeout(resolve, timeout); }); // 等待指定的时间
export const ArrayFilterWithModifications = (array, callbackFn, thisArg) => { // 过滤并修改数组（支持类数组）
  if (array === undefined || array === null) throw new TypeError('ArrayFilterWithModifications called on null or undefined');
  if (typeof callbackFn !== 'function') throw new TypeError(`${callbackFn} is not a function`);

  const length = +array.length;
  if (!length || length <= 0) { // 属性 length 无效或为 0
    array.length = 0;
    return array;
  }

  const values = []; // 过滤后的数组
  for (const key of Object.keys(array)) {
    if (!/^(?:[1-9]\d*|0)$/.test(key)) continue; // 排除在数组范围外的索引
    const index = +key;
    if (index >= length) continue;
    if (callbackFn.call(thisArg, array[key], index, array)) {
      values.push(array[key]);
    }
  }

  array.length = 0; // 清空原数组
  for (let i = 0; i < values.length; i++) { // 将过滤后的数组的元素添加到原数组中
    array[i] = values[i];
  }

  return array;
};
