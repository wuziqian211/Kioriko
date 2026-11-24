/**
 * 命令 “自定义命令”：查看、创建、修改与删除用户自定义的命令
 */

import { getDate } from '../../utils/format.js';
import { ArrayFilterWithModifications } from '../../utils/misc.js';
import { loadUserConfig, saveUserConfig } from '../../core/config.js';

export default {
  names: ['自定义命令'],
  async run({ senderUid, userInput, autoReplyFn }) {
    const userConfig = await loadUserConfig(senderUid),
          commands = userConfig.definedCommands ?? [],
          input = userInput.replace(/^自定义命令\s*/, '').split('=');
    if (input.length <= 1 && !input[0]) { // 用户没有给参数，此时返回用户设置的所有自定义命令
      if (commands.length) {
        autoReplyFn([{ msgType: 1, content: { content: `您设置的自定义命令有：\n${commands.map(c => `“${c.commandText}”，创建于 ${getDate(c.createdTimestamp)}，修改于 ${getDate(c.modifiedTimestamp)}`).join('\n')}` } }]);
      } else {
        autoReplyFn([{ msgType: 1, content: { content: '您还没有设置任何自定义命令哟 awa\n如果您想设置自定义命令，请发送：#自定义命令 {命令名}={发送内容}' } }]);
      }
      return;
    }

    const commandText = input.shift(); // 获取并删除第一个元素
    if (!commandText) {
      autoReplyFn([{ msgType: 1, content: { content: '请您提供一下命令名吧！awa' } }]);
      return;
    }
    if (commandText.replace(/^[#＃/>]/, '').trim().split(/\s+/, 1)[0] === '自定义命令') {
      autoReplyFn([{ msgType: 1, content: { content: '自定义命令名不能是 “自定义命令”（即您正在调用的命令本身），取一个相似的命令名吧 qwq' } }]);
      return;
    }
    const command = commands.find(c => c.commandText === commandText);
    if (input.length) { // 参数包含等号
      const text = input.join('=');
      if (text) { // 如果等号后面有文本，就创建或修改命令
        if (command) {
          command.text = text;
          command.modifiedTimestamp = Date.now();
        } else {
          commands.push({ commandText, text, createdTimestamp: Date.now(), modifiedTimestamp: Date.now() });
        }
        userConfig.definedCommands = commands;
        saveUserConfig(senderUid, userConfig);
        autoReplyFn([{ msgType: 1, content: { content: `设置命令成功！以后只要您发送 “${commandText}”，我就会回复：\n${text}` } }]);
      } else { // 如果等号后面没有文本，就删除命令
        if (!command) {
          autoReplyFn([{ msgType: 1, content: { content: '这个自定义命令已经不存在了哟 qwq' } }]);
          return;
        }
        ArrayFilterWithModifications(commands, c => c.commandText !== commandText);
        userConfig.definedCommands = commands;
        saveUserConfig(senderUid, userConfig);
        autoReplyFn([{ msgType: 1, content: { content: `删除命令 “${commandText}” 成功！` } }]);
      }
    } else { // 参数不包含等号，返回命令信息
      if (command) {
        autoReplyFn([{ msgType: 1, content: { content: `命令 “${command.commandText}” 创建于 ${getDate(command.createdTimestamp)}，修改于 ${getDate(command.modifiedTimestamp)}，回复内容：\n${command.text}` } }]);
      } else {
        autoReplyFn([{ msgType: 1, content: { content: '这个自定义命令不存在哟 qwq' } }]);
      }
    }
  },
};
