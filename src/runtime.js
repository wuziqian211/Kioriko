/**
 * 运行时状态
 *
 * 会被整体重新赋值的状态（config、timeDifference 等）都放在 runtime 对象里，读写时统一写成 runtime.xxx。
 * 这是因为其他模块导入的变量是只读的，不能在导入方写 config = ...。
 * 只会原地修改（push、length = 0 等）的数组直接导出即可。
 */

export const runtime = {
  config: {}, // 配置信息，initialize() 时从 ./configs/config.json 读取
  timeDifference: undefined, // 本机与服务器的时间差（毫秒），每 1 小时更新一次
  startRunningTime: undefined, // 开始运行时间（已按服务器时间校正，毫秒）
  lastTime: undefined, // 上次获取消息时间（已按服务器时间校正，毫秒）
  aiClient: undefined, // AI 客户端（OpenAI SDK 实例），initialize() 时创建
};

export const timerList = []; // 计时器 ID
export const callbackFns = []; // 获取到新消息时调用的函数，元素格式为 { func, state }；func 返回 true 时不自动回复该消息
export const messages = []; // 获取到的消息
export const shownMessages = []; // 已显示的消息的 msg_key
export const autoReplyMessages = []; // 使用自动回复的消息，元素格式为 { repliedMessageKey, replyMessageKey }
export const officialUids = [8047632, 12076317, 130061363, 9617619, 1328260, 174501086, 7584632, 37090048, 144900177, 235555226]; // 官方账号的 UID，initialize() 时会从 B 站接口更新

export const getCurrentTime = () => Date.now() - (runtime.timeDifference ?? 0); // 获取当前时间（已按服务器时间校正）
