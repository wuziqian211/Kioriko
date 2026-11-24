/**
 * 命令：开启、重置（清除上下文）与结束 AI 对话
 */

import { runtime } from '../../runtime.js';
import { loadUserConfig, saveUserConfig } from '../../core/config.js';

export const startAiChat = {
  names: ['开启对话', '开启聊天', '开始对话', 'AI', 'AI对话', 'AI聊天'],
  async run({ senderUid, autoReplyFn }) {
    const userConfig = await loadUserConfig(senderUid);
    userConfig.aiChat = true;
    saveUserConfig(senderUid, userConfig);
    autoReplyFn([{ msgType: 1, content: { content: `已经开启 AI 对话啦 ฅ(≧▽≦ฅ) 以后您发送的消息都会由 AI 回复哟！[tv_微笑]\n不过在应援团中，只有您 at 了我才能回复哟 (ง •_•)ง\n（使用的模型为 ${runtime.config.AiInfo.modelDisplayText}，发送 “#结束对话” 可以结束对话，“#清除上下文” 可以清除上下文）` } }]);
  },
};

export const resetAiChat = {
  names: ['重置对话', '重置聊天', '重置会话', '清除上下文', 'reset'],
  async run({ senderUid, autoReplyFn }) {
    const userConfig = await loadUserConfig(senderUid);
    userConfig.aiMessages = [];
    saveUserConfig(senderUid, userConfig);
    autoReplyFn([{ msgType: 1, content: { content: '已经清除了 AI 对话的上下文，AI 将不会记住您之前的对话哟 qwq' } }]);
  },
};

export const stopAiChat = {
  names: ['关闭对话', '关闭聊天', '结束对话'],
  async run({ senderUid, autoReplyFn }) {
    const userConfig = await loadUserConfig(senderUid);
    userConfig.aiChat = false;
    saveUserConfig(senderUid, userConfig);
    autoReplyFn([{ msgType: 1, content: { content: '已经关闭 AI 对话了 (｡•́︿•̀｡) 人家还想多陪一会儿的说……' } }]);
  },
};
