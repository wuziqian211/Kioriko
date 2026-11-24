/**
 * 配置文件读写：全局配置 ./configs/config.json 与用户配置 ./configs/userConfig/{UID}.json（路径相对于运行目录）
 */

import fs from 'node:fs/promises';
import { runtime } from '../runtime.js';
import { JSONParse, JSONStringify } from '../utils/json.js';

export const loadConfig = async () => JSONParse(await fs.readFile('./configs/config.json', { encoding: 'utf8' })); // 加载配置
export const saveConfig = () => fs.writeFile('./configs/config.json', JSONStringify(runtime.config, 2)); // 保存配置
export const loadUserConfig = async mid => { // 加载用户配置
  try {
    return JSONParse(await fs.readFile(`./configs/userConfig/${mid}.json`, { encoding: 'utf8' }));
  } catch {
    return {};
  }
};
export const saveUserConfig = (mid, userConfig) => fs.writeFile(`./configs/userConfig/${mid}.json`, JSONStringify(userConfig, 2)); // 保存用户配置
