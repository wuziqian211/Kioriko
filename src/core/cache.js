/**
 * 内存缓存：按 “类别 → 键” 分层存储用户、应援团、会话、视频等信息
 */

export const updatedTimestampSymbol = Symbol('Kioriko.updatedTimestamp'); // 数据更新时间的 symbol
export const cachedData = new Map(); // 缓存的用户、应援团、会话、视频等信息

export const getCache = (...args) => { // 获取缓存数据
  let cache = cachedData;
  while (args.length) {
    const category = args.shift();
    if (cache instanceof Map && cache.has(category)) {
      cache = cache.get(category);
    } else {
      return undefined;
    }
  }
  return cache;
};
export const getCategoryCache = (...categories) => { // 获取指定类型的缓存数据
  let categoryCache = cachedData;
  while (categories.length) {
    const category = categories.shift(), previousCategoryCache = categoryCache;
    categoryCache = categoryCache.get(category);
    if (!(categoryCache instanceof Map)) {
      categoryCache = new Map();
      previousCategoryCache.set(category, categoryCache);
    }
  }
  return categoryCache;
};
export const setCache = (...args) => { // 设置缓存数据
  const value = args.pop(), key = args.pop(), categoryCache = getCategoryCache(...args);
  if (typeof value === 'object') {
    categoryCache.set(key, Object.assign(structuredClone(value), { [updatedTimestampSymbol]: Date.now() }));
  } else {
    categoryCache.set(key, value);
  }
};
