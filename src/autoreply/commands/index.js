/**
 * 内置命令表
 *
 * 新增命令：在本目录下新建文件，导出 { names, run }，再把它加到下面的 commandList 里。
 * - names：命令名数组。用户消息去掉 at 自己的部分与开头的 # ＃ / > 后，第一个词与其中之一相同即触发
 * - run(ctx)：处理函数，ctx 的字段见 ../index.js 开头的说明
 */
import greeting from './greeting.js';
import systemInfo from './systemInfo.js';
import customCommand from './customCommand.js';
import getInfo from './getInfo.js';
import relation from './relation.js';
import registerTime from './registerTime.js';
import profile from './profile.js';
import { startAiChat, resetAiChat, stopAiChat } from './aiSwitch.js';
import { examScore, help, about } from './staticReplies.js';

export const commandList = [greeting, systemInfo, customCommand, getInfo, relation, registerTime, profile, startAiChat, resetAiChat, stopAiChat, examScore, help, about];

const commandMap = new Map(commandList.flatMap(c => c.names.map(name => [name, c])));
export const findCommand = name => commandMap.get(name); // 根据命令名查找命令，找不到时返回 undefined
