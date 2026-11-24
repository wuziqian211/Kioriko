/**
 * 统一导出所有模块的函数与状态，方便在其他脚本中使用，例如：
 * import { initialize, sendMessage, getUserInfo } from './src/index.js';
 * 注意：调用需要登录的接口前，需要先 await initialize()
 */

export { runtime, timerList, callbackFns, messages, shownMessages, autoReplyMessages, officialUids, getCurrentTime } from './runtime.js';
export { messageSources, USER_AGENT, videoZones, videoStates } from './constants.js';
export { getDate, getTime, getNumber, longTextHandler, formatString } from './utils/format.js';
export { trueColorToSupportedColor, style, colorEmote } from './utils/color.js';
export { JSONParse, JSONStringify } from './utils/json.js';
export { exec, wait, ArrayFilterWithModifications } from './utils/misc.js';
export { toBV, toAV, idParser } from './utils/id.js';
export { timestamp, logError } from './utils/log.js';
export { updatedTimestampSymbol, cachedData, getCache, getCategoryCache, setCache } from './core/cache.js';
export { loadConfig, saveConfig, loadUserConfig, saveUserConfig } from './core/config.js';
export { convertToLocalPath, notify } from './core/notify.js';
export { fetchMessages } from './core/poller.js';
export { initialize, uninitialize } from './core/lifecycle.js';
export { appSign, encodeWbi } from './api/sign.js';
export { headers, callAPI } from './api/client.js';
export { updateTimeDifference, updateWbiKeys } from './api/sync.js';
export { getBilibiliUid, getOfficialUids, getUserInfo, getUsersInfo, getUserCard, searchUsers, updateSign } from './api/user.js';
export { getVideoInfo, getVideoDetail } from './api/video.js';
export { getGroupInfo, getMyGroups, getMembersList, getMembersRole, getFansMedal, getFansMedalByGroupId, joinGroup } from './api/group.js';
export { getUserStat, getUsersStat, getUserRelation, getUsersRelation, modifyUserRelation, modifyUsersRelation, getRelationTagsList, getUserRelationTags, modifyUsersRelationTags, copyUsersTo, moveUsersFrom, follow, unfollow, specialFollow } from './api/relation.js';
export { getSessionInfo, getSessionDetail } from './api/session.js';
export { fetchImageMeta, uploadImage } from './api/image.js';
export { charge, likeUserDynamics } from './api/actions.js';
export { getMessages, getAllMessages } from './message/fetch.js';
export { messageContentHandler, messagesHandler } from './message/render.js';
export { ackMessage, sendMessage } from './message/send.js';
export { autoReply } from './autoreply/reply.js';
export { autoReplyHandler } from './autoreply/index.js';
export { cancelWaiting, waitForReply } from './autoreply/waiting.js';
export { resolveUser } from './autoreply/resolveUser.js';
export { commandList, findCommand } from './autoreply/commands/index.js';
export { aiChat } from './ai/chat.js';
export { toolDefinitions, runTool } from './ai/tools.js';
