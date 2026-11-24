/**
 * @file Kioriko 入口
 * @version 1.0.0
 * @date 2026-11-24
 * @author 晨叶梦春
 * @license MIT
 *
 * 启动：在包含 configs 目录的文件夹中运行 node index.js（配置路径相对于运行目录）
 * 代码结构与维护说明见 README.md
 */

import util from 'node:util';
import { initialize, uninitialize } from './src/core/lifecycle.js';

const errorHandler = error => console.error(error); // 错误处理
process.on('uncaughtException', errorHandler).on('unhandledRejection', errorHandler);

console.log(`正在启动 ${util.styleText('cyanBright', 'Kioriko')}...`);

if (!await initialize()) process.exit(1); // 登录失败时直接退出

const shutdown = () => { // 退出前清除计时器
  uninitialize();
  process.exit(0);
};
process.on('SIGINT', shutdown).on('SIGTERM', shutdown);
