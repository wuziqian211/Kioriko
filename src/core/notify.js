/**
 * 系统通知：下载图标到本地（支持 WSL）并发送通知
 */

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import isWSL from 'is-wsl'; // 判断是否在 WSL 中运行
import notifier from 'node-notifier'; // 发送通知
import { exec } from '../utils/misc.js';
import { getCache, setCache } from './cache.js';
import { headers } from '../api/client.js';

export const convertToLocalPath = async (pathArg, useWindowsPathInWSL) => { // 将给定的路径转换为本地路径
  if (/^(?:https?:)?\/\//.test(pathArg)) {
    const urlObj = new URL(pathArg, 'https://i0.hdslb.com/');
    if (/^https?:\/\/(?:[is]\d+\.hdslb\.com|[-0-9a-z]+\.biliimg\.com)$/.test(urlObj.origin)) { // 图片源为 B 站图床，就检测文件是否已存储在本地
      const { pathname } = urlObj, cachedInfo = getCache('LocalPath', pathname);
      if (cachedInfo) {
        try {
          if ((await fs.stat(cachedInfo.localPath)).size === cachedInfo.size) { // 根据文件大小是否一致来粗略判断在本地存储的文件是否有效
            return cachedInfo.returnedLocalPath;
          }
        } catch { /* 无操作 */ }
      }
    }

    const resp = await fetch(urlObj, { headers });
    if (resp.ok) {
      const file = Buffer.from(await resp.arrayBuffer());
      let tmpDir, localPath, returnedLocalPath;

      if (useWindowsPathInWSL && isWSL) { // 在 WSL 中使用 Windows 路径
        const tmpDirInWindows = path.win32.join(
          (await exec('cmd.exe /c "echo %Temp%"', { encoding: 'utf8' })).stdout.trim(), // 通过运行 CMD 命令获取 Windows 中的临时目录
          'Kioriko',
        );
        tmpDir = tmpDirInWindows.replace(/\\/g, '/') // 将反斜杠替换为正斜杠
          .replace(/^(?<drive>[A-Za-z]):/, (match, drive) => `/mnt/${drive.toLowerCase()}`); // 改写为在 Linux 中表示的 Windows 的路径
        localPath = path.join(tmpDir, urlObj.pathname.split('/').at(-1));
        returnedLocalPath = path.win32.join(tmpDirInWindows, urlObj.pathname.split('/').at(-1));
      } else {
        tmpDir = path.join(os.tmpdir(), 'Kioriko');
        localPath = path.join(tmpDir, urlObj.pathname.split('/').at(-1));
        returnedLocalPath = localPath;
      }

      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(localPath, file);

      if (/^https?:\/\/(?:[is]\d+\.hdslb\.com|[-0-9a-z]+\.biliimg\.com)$/.test(urlObj.origin)) { // 图片源为 B 站图床
        const { pathname } = urlObj;
        setCache('LocalPath', pathname, { localPath, returnedLocalPath, size: file.length });
      }

      return returnedLocalPath;
    } else {
      return null;
    }
  } else {
    return pathArg;
  }
};
export const notify = async options => notifier.notify({ 'app-name': 'Kioriko', sound: true, ...options, icon: options.icon && await convertToLocalPath(options.icon, true) }); // 发送系统通知
