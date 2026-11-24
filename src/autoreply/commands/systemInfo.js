/**
 * 命令 “系统信息”：服务器系统、CPU、内存与 IO 占用（依赖 /etc/os-release 与 iostat，仅支持 Linux）
 */

import os from 'node:os';
import fs from 'node:fs/promises';
import { JSONParse } from '../../utils/json.js';
import { exec } from '../../utils/misc.js';

export default {
  names: ['系统信息', '获取系统信息', '系统占用'],
  async run({ autoReplyFn }) {
    const cpuUsage = os.cpus(), freeMem = os.freemem(), totalMem = os.totalmem(),
          [infoExec, ioExec] = await Promise.all([
            fs.readFile('/etc/os-release', { encoding: 'utf8' }),
            exec('iostat -x -o JSON', { encoding: 'utf8' }),
          ]);
    const systemInfo = Object.fromEntries(infoExec.split('\n').filter(i => i).map(i => i.split('=', 2))
            .map(([key, value]) => [key, value?.replace(/^"(?<value>.*)"$/, '$1') || '未知'])),
          ioInfo = JSONParse(ioExec.stdout).sysstat.hosts[0].statistics[0];
    autoReplyFn([{ msgType: 1, content: { content: `系统：${systemInfo.PRETTY_NAME}\nCPU 占用：${(cpuUsage.reduce((accumulator, { times: { user, nice, sys, irq } }) => accumulator + user + nice + sys + irq, 0) / cpuUsage.reduce((accumulator, { times: { user, nice, sys, idle, irq } }) => accumulator + user + nice + sys + idle + irq, 0) * 100).toFixed(2)}%\n内存占用：${((totalMem - freeMem) / totalMem * 100).toFixed(2)}%（${((totalMem - freeMem) / 1048576).toFixed(2)} MB / ${(totalMem / 1048576).toFixed(2)} MB）\nIO 负载：${ioInfo.disk[2].util}%` } }]);
  },
};
