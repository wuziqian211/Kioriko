/**
 * AI 对话：维护上下文、调用模型、处理工具调用并回复
 */

import md5 from 'md5';
import { runtime } from '../runtime.js';
import { getDate, formatString } from '../utils/format.js';
import { style } from '../utils/color.js';
import { JSONParse, JSONStringify } from '../utils/json.js';
import { loadUserConfig, saveUserConfig } from '../core/config.js';
import { getUserCard } from '../api/user.js';
import { toolDefinitions, runTool } from './tools.js';

export const aiChat = async ({ repliedMessage, content, senderUid, msgSource, autoReplyFn }) => { // AI 对话：用户开启 AI 对话后，不是命令的文字消息都交给这里处理
  const userConfig = await loadUserConfig(senderUid);
  if (userConfig.aiChat) {
    const aiMessages = userConfig.aiMessages ?? [], { name } = await getUserCard(senderUid);
    if (!aiMessages.length) {
      aiMessages.push(...runtime.config.AiInfo.systemMessages.map(m => ({ role: 'system', content: formatString(m, { name, modelDisplayText: runtime.config.AiInfo.modelDisplayText }) })));
    }

    const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
          d = new Date(repliedMessage.timestamp * 1000 + (new Date().getTimezoneOffset() + 480) * 60000);
    aiMessages.push(
      { role: 'latest_reminder', content: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')},${weeks[d.getDay()]},,${[3, 4, 7].includes(msgSource) ? 'Web' : 'App'},中文` }, // <date>,<weekday>,<location>,<platform>,<language>
      { role: 'user', content: [{ type: 'text', text: content.content }], name },
    );

    loop: while (true) {
      const completion = await runtime.aiClient.chat.completions.create({
        messages: aiMessages,
        model: runtime.config.AiInfo.model,
        thinking: { type: 'enabled' },
        reasoning_effort: 'low',
        max_tokens: 8192,
        response_format: { type: 'text' },
        stream: false,
        temperature: 1.3,
        tools: toolDefinitions,
        tool_choice: 'auto',
        safety_check: { level: 'high' },
        title: { enabled: false },
        logprobs: false,
        user_id: `YumeHaru-debcdf9b-c2c6-4839-81cd-7d3fcde7abb4-Kioriko-${md5(`550bb27f-c163-42b3-988d-957d7747ae54${senderUid}`)}`,
      });
      const {
        choices: [{ finish_reason: finishReason, message: aiMessage }],
        usage: {
          completion_tokens: completionTokens,
          prompt_tokens: promptTokens,
          prompt_cache_hit_tokens: promptCacheHitTokens,
          completion_tokens_details: { reasoning_tokens: reasoningTokens },
          server_tool_use: serverToolUse,
        },
      } = completion;

      switch (finishReason) {
        case 'stop':
          aiMessages.push({ role: aiMessage.role, content: aiMessage.content, reasoning_content: aiMessage.reasoning_content, tool_calls: aiMessage.tool_calls, server_tool_calls: aiMessage.server_tool_calls });
          userConfig.aiMessages = aiMessages;
          saveUserConfig(senderUid, userConfig);
          autoReplyFn([
            ...(aiMessage.reasoning_content ? [{ msgType: 1, content: { content: aiMessage.reasoning_content }, autoReplyMark: '思考过程' }] : []),
            ...(aiMessage.content ? [{ msgType: 1, content: { content: aiMessage.content }, autoReplyMark: 'AI 回复' }] : []),
            { msgType: 1, content: { content: `↑ ${promptTokens} tokens（缓存 ${promptCacheHitTokens}） ↓ ${completionTokens} tokens（思考链 ${reasoningTokens}）${serverToolUse ? `\n搜索 ${serverToolUse.tool_search} 次 / 网页抓取 ${serverToolUse.tool_fetch} 次 / 图片搜索 ${serverToolUse.tool_image_search} 次` : ''}` }, autoReplyMark: '使用情况' },
          ]);
          break loop;
        case 'tool_calls':
          aiMessages.push({ role: aiMessage.role, content: aiMessage.content, reasoning_content: aiMessage.reasoning_content, tool_calls: aiMessage.tool_calls, server_tool_calls: aiMessage.server_tool_calls });
          if (aiMessage.reasoning_content || aiMessage.content) {
            autoReplyFn([
              ...(aiMessage.reasoning_content ? [{ msgType: 1, content: { content: aiMessage.reasoning_content }, autoReplyMark: '思考过程' }] : []),
              ...(aiMessage.content ? [{ msgType: 1, content: { content: aiMessage.content }, autoReplyMark: 'AI 回复' }] : []),
              { msgType: 1, content: { content: `↑ ${promptTokens} tokens（缓存 ${promptCacheHitTokens}） ↓ ${completionTokens} tokens（思考链 ${reasoningTokens}）${serverToolUse ? `\n搜索 ${serverToolUse.tool_search} 次 / 网页抓取 ${serverToolUse.tool_fetch} 次 / 图片搜索 ${serverToolUse.tool_image_search} 次` : ''}` }, autoReplyMark: '使用情况' },
            ]);
          }
          for (const { id: toolCallId, function: { name: funcName, arguments: originalFuncArgs } } of aiMessage.tool_calls) {
            const funcArgs = JSONParse(originalFuncArgs);
            console.log(`${style('gray', `[${getDate(Date.now())}]`)} 调用工具 ${style('cyanBright', funcName)}，参数：\n${Object.entries(funcArgs).map(([k, v]) => `${style(['bold', 'whiteBright'], `${k}：`)}${v}`).join('\n')}`);
            // autoReplyFn([{ msgType: 1, content: { content: `正在调用工具 \`${funcName}\`，请耐心等待哟 (ง •_•)ง` } }]);

            try {
              aiMessages.push({ role: 'tool', content: JSONStringify(await runTool(funcName, funcArgs, autoReplyFn)), tool_call_id: toolCallId });
            } catch (e) {
              aiMessages.push({ role: 'tool', content: JSONStringify({ success: false, error: e.message }, 2), tool_call_id: toolCallId });
            }
          }

          break;
        case 'content_filter':
          autoReplyFn([{ msgType: 1, content: { content: '非常抱歉，AI 回复的内容被安全策略拦截了 ≧ ﹏ ≦\n请尝试发送其他内容或更换话题哟 qwq' } }]);
          break loop;
        default:
          autoReplyFn([{ msgType: 1, content: { content: `非常抱歉，调用 AI 模型时出现了错误 (。﹏。*)\n原因：${finishReason}` } }]);
          break loop;
      }
    }
  }
};
