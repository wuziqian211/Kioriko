/**
 * 消息显示：把消息转换成控制台文本与系统通知内容
 */

import { runtime, messages } from '../runtime.js';
import { messageSources } from '../constants.js';
import { getDate, getTime, getNumber, longTextHandler } from '../utils/format.js';
import { trueColorToSupportedColor, style, colorEmote } from '../utils/color.js';
import { JSONParse } from '../utils/json.js';
import { toBV } from '../utils/id.js';
import { getUsersInfo } from '../api/user.js';
import { getGroupInfo, getMembersRole, getFansMedal } from '../api/group.js';

export const messageContentHandler = message => { // 将消息的内容转换成控制台输出的文本与系统通知的内容
  const { msg_type: msgType, content: originalContent, msg_status: status } = message,
        statusList = new Map([[1, `${style(['bold', 'redBright'], '[已撤回]')} `], [2, `${style(['bold', 'redBright'], '[系统撤回]')} `], [50, `${style(['bold', 'yellowBright'], '[链接失效]')} `]]); // 消息状态列表
  let outputContent, notifyMessage;
  try {
    const content = JSONParse(originalContent);
    switch (msgType) {
      // 1. 基础消息类型
      case 1: // 纯文本
        outputContent = style('whiteBright', colorEmote(content.content));
        notifyMessage = content.content;
        break;
      case 2: // 图片
        outputContent = `${style(['bold', 'blueBright'], '[图片]')} ${style(['underline', 'whiteBright'], content.url)}（${content.width && content.height ? `${content.width}×${content.height}` : '未知尺寸'}，${content.size ? `${content.size} KB` : '未知大小'}）`;
        notifyMessage = `[图片] ${content.url}`;
        break;
      /* case 3: // 语音消息（？） */
      /* case 4: // 旧版分享（已弃用） */
      case 5: { // 撤回
        const withdrawnMessage = messages.find(m => m.msg_key === content); // 被撤回的消息
        if (withdrawnMessage) {
          if (message.sys_cancel) { // 系统撤回（撤回后从 B 站 API 无法获取到被系统撤回的消息）
            withdrawnMessage.msg_status = 2;
          } else { // 普通的撤回（撤回后从 B 站 API 仍然可以获取到被普通撤回的消息）
            withdrawnMessage.msg_status = 1;
          }
          const withdrawnMessageContent = messageContentHandler(withdrawnMessage).outputContent;
          outputContent = `${style('redBright', message.sys_cancel ? '系统撤回' : '撤回')}了一条消息，${style(['bold', 'whiteBright'], '撤回的消息 ID：')}${style('whiteBright', content)}，${style(['bold', 'whiteBright'], '内容：')}${longTextHandler(withdrawnMessageContent)}`;
        } else {
          outputContent = `${style('redBright', message.sys_cancel ? '系统撤回' : '撤回')}了一条消息，${style(['bold', 'whiteBright'], '撤回的消息 ID：')}${style('whiteBright', content)}`;
        }
        notifyMessage = `${message.sys_cancel ? '系统撤回' : '撤回'}了一条消息`;
        break;
      }
      case 6: // 自定义表情
        outputContent = `${style(['bold', 'blueBright'], '[自定义表情]')} ${style(['underline', 'whiteBright'], content.url)}（${content.width && content.height ? `${content.width}×${content.height}` : '未知尺寸'}，${content.size ? `${content.size} KB` : '未知大小'}）`;
        notifyMessage = `[自定义表情] ${content.url}`;
        break;
      case 7: // 分享内容
        switch (content.source) {
          case 1: // 小视频（已弃用）
            outputContent = `${style(['bold', 'blueBright'], '[分享]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}
${style('whiteBright', '小视频')}，${style('yellowBright', `vc${content.id}`)}，${style(['bold', 'whiteBright'], 'UP 主：')}${style('cyanBright', content.author)}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.thumb)}`;
            break;
          case 4: // 直播
            outputContent = `${style(['bold', 'blueBright'], '[分享]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}
${style('whiteBright', '直播')}，${style(['bold', 'whiteBright'], 'ID：')}${style('yellowBright', content.id)}，${style(['bold', 'whiteBright'], '主播：')}${style('cyanBright', content.author)}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.thumb)}`;
            break;
          case 5: // 视频
            outputContent = `${style(['bold', 'blueBright'], '[分享]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}
${style('whiteBright', '视频')}，${style('yellowBright', toBV(content.id))}，${style(['bold', 'whiteBright'], 'UP 主：')}${style('cyanBright', content.author)}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.thumb)}`;
            break;
          case 6: // 专栏
            outputContent = `${style(['bold', 'blueBright'], '[分享]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}
${style('whiteBright', '专栏')}，${style('yellowBright', `cv${content.id}`)}，${style(['bold', 'whiteBright'], 'UP 主：')}${style('cyanBright', content.author)}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.thumb)}`;
            break;
          case 7: // 番剧
            outputContent = `${style(['bold', 'blueBright'], '[分享]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}
${style('whiteBright', '番剧')}，${style('yellowBright', `ss${content.id}`)}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.thumb)}`;
            break;
          case 9: // 国产动画
            outputContent = `${style(['bold', 'blueBright'], '[分享]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}
${style('whiteBright', '国产动画')}，${style('yellowBright', toBV(content.id))}，${style(['bold', 'whiteBright'], 'UP 主：')}${style(['bold', 'cyanBright'], content.author)}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.thumb)}`;
            break;
          case 16: // 番剧
            outputContent = `${style(['bold', 'blueBright'], '[分享]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}
${style('whiteBright', content.source_desc)}，${style('yellowBright', `ep${content.id}`)}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.thumb)}`;
            break;
          default: { // 其他类型
            const sources = new Map([[2, '相簿'], [3, '纯文字'], [8, '音乐'], [10, '图片'], [11, '动态'], [17, '番剧']]);
            outputContent = `${style(['bold', 'blueBright'], '[分享]')} ${content.headline ? `${style(['bold', 'doubleunderline', 'whiteBright'], content.headline)}
${style('whiteBright', content.title)}` : style(['bold', 'underline', 'whiteBright'], content.title)}
${sources.has(content.source) ? style('whiteBright', sources.get(content.source)) : '未知类型'}，${style(['bold', 'whiteBright'], 'ID：')}${style('yellowBright', content.id)}，${style(['bold', 'whiteBright'], 'UP 主：')}${style('cyanBright', content.author)}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.thumb)}`;
          }
        }
        notifyMessage = `[分享] ${content.headline || content.title}`;
        break;
      /* case 8: // 系统撤回消息（此类型仅用作发送消息，在获取消息时消息类型为 5 且 sys_cancel 为 1） */
      case 9: // 小程序
        outputContent = `${style(['bold', 'blueBright'], '[小程序]')} 来自 ${style('cyanBright', content.name)}（${style(['bold', 'whiteBright'], '图标：')}${style('underline', content.avatar)}）
${style(['bold', 'underline', 'whiteBright'], content.title)}（${style('underline', content.jump_uri)}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.cover)}）`;
        notifyMessage = `[小程序] ${content.title}`;
        break;

      // 2. 扩展消息类型
      case 10: // 通知
        outputContent = `${style(['bold', 'blueBright'], '[通知]')} ${content.notifier ? `来自 ${style('cyanBright', content.notifier.nickname)}（${content.notifier.jump_url ? `${style('underline', content.notifier.jump_url)}，` : ''}${style(['bold', 'whiteBright'], '图标：')}${style('underline', content.notifier.avatar_url)}）
` : ''}${style(['bold', 'doubleunderline', 'whiteBright'], content.title)}
${content.text}${content.modules ? `\n${content.modules.map(m => `${style(['bold', 'whiteBright'], `${m.title}：`)}${m.detail}`).join('\n')}` : ''}${content.jump_uri ? `
${style('whiteBright', content.jump_text || '查看详情')}（${style('underline', content.jump_uri)}）` : ''}${content.jump_uri_2 ? `
${style('whiteBright', content.jump_text_2 || '查看详情')}（${style('underline', content.jump_uri_2)}）` : ''}${content.jump_uri_3 ? `
${style('whiteBright', content.jump_text_3 || '查看详情')}（${style('underline', content.jump_uri_3)}）` : ''}`;
        notifyMessage = `[通知] ${content.title}`;
        break;
      case 11: // 视频推送
        if (content.pub_date) { // 消息内容包含视频的信息
          outputContent = `${style(['bold', 'blueBright'], '[视频]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}
${style('yellowBright', toBV(content.rid))}，${getTime(content.times)}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.cover)}，${style(['bold', 'whiteBright'], '播放数：')}${getNumber(content.view)}，${style(['bold', 'whiteBright'], '弹幕数：')}${getNumber(content.danmaku)}，${style(['bold', 'whiteBright'], '简介：')}${longTextHandler(content.desc)}${content.attach_msg?.content ? `\n${/^UP主赠言：/.test(content.attach_msg.content) ? `${style(['bold', 'whiteBright'], 'UP 主赠言：')}${style('whiteBright', colorEmote(content.attach_msg.content.replace(/^UP主赠言：/, '')))}` : style('whiteBright', colorEmote(content.attach_msg.content))}` : ''}`;
          notifyMessage = `[视频] ${content.title}`;
        } else {
          outputContent = `${style(['bold', 'blueBright'], '[视频]')} ${content.pub_date === 0 ? style(['bold', 'redBright'], '[已失效]') : style(['bold', 'yellowBright'], '[获取信息失败]')} ${style('yellowBright', toBV(content.rid))}${content.attach_msg?.content ? `\n${/^UP主赠言：/.test(content.attach_msg.content) ? `${style(['bold', 'whiteBright'], 'UP 主赠言：')}${style('whiteBright', colorEmote(content.attach_msg.content.replace(/^UP主赠言：/, '')))}` : style('whiteBright', colorEmote(content.attach_msg.content))}` : ''}`;
        }
        break;
      case 12: // 专栏推送
        if (content.pub_date) { // 消息内容包含专栏的信息
          outputContent = `${style(['bold', 'blueBright'], '[专栏]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}
${style('yellowBright', `cv${content.rid}`)}，${style(['bold', 'whiteBright'], '封面：')}${content.image_urls?.map(u => `${style('underline', u)}`).join('，') || '无'}，${style(['bold', 'whiteBright'], '阅读数：')}${getNumber(content.view)}，${style(['bold', 'whiteBright'], '点赞数：')}${getNumber(content.like)}，${style(['bold', 'whiteBright'], '评论数：')}${getNumber(content.reply)}，${style(['bold', 'whiteBright'], '简介：')}${longTextHandler(content.summary)}${content.attach_msg?.content ? `\n${/^UP主赠言：/.test(content.attach_msg.content) ? `${style(['bold', 'whiteBright'], 'UP 主赠言：')}${style('whiteBright', colorEmote(content.attach_msg.content.replace(/^UP主赠言：/, '')))}` : style('whiteBright', colorEmote(content.attach_msg.content))}` : ''}`;
          notifyMessage = `[专栏] ${content.title}`;
        } else {
          outputContent = `${style(['bold', 'blueBright'], '[专栏]')} ${content.pub_date === 0 ? style(['bold', 'redBright'], '[已失效]') : style(['bold', 'yellowBright'], '[获取信息失败]')} ${style('yellowBright', `cv${content.rid}`)}${content.attach_msg?.content ? `\n${/^UP主赠言：/.test(content.attach_msg.content) ? `${style(['bold', 'whiteBright'], 'UP 主赠言：')}${style('whiteBright', colorEmote(content.attach_msg.content.replace(/^UP主赠言：/, '')))}` : style('whiteBright', colorEmote(content.attach_msg.content))}` : ''}`;
        }
        break;
      case 13: // 图片卡片
        outputContent = `${style(['bold', 'blueBright'], '[图片卡片]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}（${style('underline', content.jump_url)}，${style(['bold', 'whiteBright'], '图片：')}${style('underline', content.pic_url)}）`;
        notifyMessage = `[图片卡片] ${content.title}`;
        break;
      case 14: // 分享内容（新）
        outputContent = `${style(['bold', 'blueBright'], '[分享]')} ${style(['bold', 'underline', 'whiteBright'], content.title)}
${style('whiteBright', content.source)}，${style('underline', content.url)}，${content.author ? `${style(['bold', 'whiteBright'], 'UP 主：')}${style('cyanBright', content.author)}，` : ''}${style(['bold', 'whiteBright'], '封面：')}${style('underline', content.cover)}，${style(['bold', 'whiteBright'], '简介：')}${longTextHandler(content.desc)}`;
        notifyMessage = `[分享] ${content.title}`;
        break;
      /* case 15: // 文字分享（？） */
      case 16: { // 被关注时的自动推送
        const icons = new Map([[1, '播放量'], [3, '弹幕数'], [5, '收藏量']]);
        outputContent = `${style(['bold', 'blueBright'], '[自动推送]')} ${style(['bold', 'doubleunderline', 'whiteBright'], content.main_title)}
${content.sub_cards.map(c => `${style(['bold', 'underline', 'whiteBright'], c.field1)}（${style('yellowBright', toBV(c.card_id))}，${c.field2}，${style(['bold', 'whiteBright'], '封面：')}${style('underline', c.cover_url)}，${style(['bold', 'whiteBright'], `${icons.has(c.icon3) ? icons.get(c.icon3) : '播放量'}：`)}${c.field3}，${style(['bold', 'whiteBright'], `${icons.has(c.icon4) ? icons.get(c.icon4) : '弹幕数'}：`)}${c.field4}）`).join('\n')}`;
        break;
      }
      /* case 17: // 客服消息中直接发送的视频（暂不作处理） */
      case 18: { // 系统提示（例如 “对方主动回复或关注你前，最多发送1条消息”）
        const innerContent = JSONParse(content.content);
        outputContent = innerContent.map(c => c.text).join('\n');
        break;
      }
      /* case 19: // AI 消息（尚未得到广泛使用，暂不作处理） */
      case 51: { // 使某条消息的图片失效
        const invalidMessage = messages.find(m => m.msg_key === content); // 图片已经失效的消息
        if (invalidMessage) {
          invalidMessage.msg_status = 50;
          const invalidMessageContent = messageContentHandler(invalidMessage).outputContent;
          outputContent = `有一条消息的${style('yellowBright', '图片已失效')}，${style(['bold', 'whiteBright'], '失效的图片的消息 ID：')}${style('whiteBright', content)}，${style(['bold', 'whiteBright'], '内容：')}${longTextHandler(invalidMessageContent)}`;
        } else {
          outputContent = `有一条消息的${style('yellowBright', '图片已失效')}，${style(['bold', 'whiteBright'], '失效的图片的消息 ID：')}${style('whiteBright', content)}`;
        }
        break;
      }

      // 3. 功能类系统消息类型（未实现）

      // 4. 应援团通知消息类型（当会话 ID 为 0 且会话类型为 1 时）
      case 201: // 应援团解散
        outputContent = `${style('blueBright', content.group_name)} 已被解散`;
        break;
      case 202: // 加入应援团
        outputContent = `您已加入 ${style('blueBright', content.group_name)}`;
        break;
      case 203: // 成员主动退群（当自己为该应援团的 UP 主或管理员时）
        outputContent = `${style('cyanBright', content.member_name)} 已退出 ${style('blueBright', content.group_name)}`;
        break;
      case 204: // 被撤销应援团管理员
        outputContent = `您被撤销 ${style('blueBright', content.group_name)} 的管理员身份`;
        break;
      case 205: // 被移出应援团（自己为被移出的成员）
        outputContent = `您被 ${style('yellowBright', content.admin_name)} 移出 ${style('blueBright', content.group_name)}`;
        break;
      case 206: // 用户被移出应援团（当自己为该应援团的 UP 主或管理员时）
        outputContent = `${style('cyanBright', content.member_name)} 被 ${style('yellowBright', content.admin_name)} 移出 ${style('blueBright', content.group_name)}`;
        break;
      case 207: // 成为应援团管理员
        outputContent = `您已成为 ${style('blueBright', content.group_name)} 的管理员`;
        break;
      case 208: // 自动创建应援团
        outputContent = `已创建 ${style('blueBright', content.group_name)}`;
        break;

      // 5. 应援团系统消息类型（当会话类型为 2 且发送者 ID 为 0 时）
      case 301: // 成员入群
      case 302: // 成员退群
      case 303: // 应援团冻结
      case 304: // 应援团解散
        outputContent = `${style(['bold', 'blueBright'], '[应援团通知]')} ${style('whiteBright', content.content)}`;
        notifyMessage = content.content;
        break;
      case 305: // 开通应援团
        outputContent = `${style(['bold', 'blueBright'], '[应援团开通]')} ${/^.+开通啦 \(>▽<\)$/.test(content.content) ? content.content.replace(/^(?<name>.+)开通啦 \(>▽<\)$/, `${style('blueBright', '$1')} 开通啦 (>▽<)`) : style('whiteBright', content.content)}`;
        notifyMessage = content.content;
        break;
      case 306: // 有成员进入应援团
        outputContent = `${style(['bold', 'blueBright'], '[新成员入群]')} ${/^欢迎.+入群$/.test(content.content) ? content.content.replace(/^欢迎(?<name>.+)入群$/, `欢迎 ${style('cyanBright', '$1')} 入群`) : style('whiteBright', content.content)}`;
        notifyMessage = content.content;
        break;

      // 6. 客服消息类型（未实现）
      default:
        outputContent = `${style(['bold', 'blueBright'], `[未知类型（${msgType}）消息]`)} ${originalContent}`;
        notifyMessage = `[未知类型（${msgType}）消息]`;
    }
  } catch {
    outputContent = style('redBright', `解析此消息时出现错误，类型 ${msgType}`);
    notifyMessage = '[无法解析的消息]';
  }
  return {
    outputContent: `${statusList.has(status) ? statusList.get(status) : ''}${outputContent}${message.key_hit_infos?.toast ? `\n${style('yellowBright', message.key_hit_infos.toast)}` : ''}`,
    notifyMessage: [1, 2].includes(status) ? null : notifyMessage,
  };
};
export const messagesHandler = async (inputMessages, sessionInfo) => { // 将多条消息转换成控制台输出的文本与系统通知对象
  if (!inputMessages?.length) return { output: [], notifyObjects: [] };

  const colorDepth = process.stdout.getColorDepth(),
        { AccountInfo: { mid: selfMid } } = runtime.config,
        { talkerId, sessionType, name, avatar, isSystem, groupType } = sessionInfo,
        roles = new Map([ // 应援团成员权限列表
          [1, colorDepth >= 4 ? `${style('magenta', '▕')}${style(['bold', 'bgMagenta', 'redBright'], groupType === 2 ? '群主' : ' UP ')}${style('magenta', '▏')}` : groupType === 2 ? ' [群主]' : ' [ UP ]'],
          [2, colorDepth >= 4 ? `${style('yellow', '▕')}${style(['bold', 'bgYellow', 'yellowBright'], '管理员')}${style('yellow', '▏')}` : ' [管理员]'],
          [3, ''],
        ]),
        talkers = [ // 聊天用户
          ...inputMessages.map(m => m.sender_uid).filter(m => m !== 0),
          ...inputMessages.filter(m => m.receiver_type === 1).map(m => m.receiver_id).filter(m => m !== 0),
        ],
        output = [], notifyObjects = [];

  let usersInfo, membersRole, medalDetails, medalName = '粉丝团';
  if (sessionType === 2) { // 为应援团
    let groupInfo;
    [usersInfo, membersRole, groupInfo] = await Promise.all([
      getUsersInfo(talkers), // 获取聊天用户的信息
      getMembersRole(talkerId, talkers), // 获取成员权限
      getGroupInfo(talkerId), // 获取应援团信息
    ]);
    if (groupType !== 2 && groupInfo?.owner_uid) { // 获取 UP 主粉丝勋章信息
      medalDetails = await getFansMedal(groupInfo.owner_uid, talkers, false);
      if (groupInfo.fans_medal_name) medalName = groupInfo.fans_medal_name;
    }
  } else { // 不为应援团，则只获取聊天用户的信息
    usersInfo = await getUsersInfo(talkers);
  }

  for (const m of inputMessages) {
    const displaySendTime = style('gray', `[${getDate(m.timestamp * 1000)}]`),
          displayAt = m.at_uids?.includes(selfMid) ? ` ${style(['bold', 'greenBright'], '[有人@你]')}` : '',
          displaySenderColor = m.sender_uid === 0 || (isSystem && sessionType === 1 && m.sender_uid === talkerId) ? 'whiteBright'
          : m.sender_uid === selfMid ? 'magentaBright' : 'cyanBright',
          displaySenderName = name && sessionType === 1 && m.sender_uid === talkerId ? name
          : m.sender_uid === 0 || (isSystem && sessionType === 1 && m.sender_uid === talkerId) ? '系统' : usersInfo.get(m.sender_uid)?.name,
          displayReceiverColor = m.receiver_id === 0 || (isSystem && m.receiver_type === sessionType && m.receiver_id === talkerId) ? 'whiteBright'
          : m.receiver_type === 1 ? m.receiver_id === selfMid ? 'magentaBright' : 'yellowBright'
          : m.receiver_type === 2 ? 'blueBright' : 'yellowBright',
          displayReceiverName = name && m.receiver_type === sessionType && m.receiver_id === talkerId ? name
          : m.receiver_id === 0 || (isSystem && m.receiver_type === sessionType && m.receiver_id === talkerId) ? '系统'
          : m.receiver_type === 1 ? usersInfo.get(m.receiver_id)?.name
          : m.receiver_type === 2 ? (await getGroupInfo(m.receiver_id))?.group_name : undefined,
          displayMessageSource = messageSources.has(m.msg_source) ? `（来自 ${style(['bold', messageSources.get(m.msg_source).bySystem ? 'cyanBright' : 'gray'], messageSources.get(m.msg_source).name)}）` : '';

    let displayMemberRole = '', displayMedalDetail = '';
    if (sessionType === 2) {
      const memberRole = membersRole?.get(m.sender_uid);
      if (memberRole && roles.has(memberRole)) displayMemberRole = roles.get(memberRole);

      if (groupType !== 2 && medalDetails) {
        const medalDetail = medalDetails.get(m.sender_uid);
        if (medalDetail) {
          const bgColor = trueColorToSupportedColor(medalDetail.fans_medal_color, true),
                textColor = trueColorToSupportedColor(medalDetail.fans_medal_color);
          displayMedalDetail = colorDepth >= 4 ? `${textColor[0]}▕${textColor[1]}${bgColor[0]}${style(['bold', 'whiteBright'], medalName)}${bgColor[1]}${textColor[0]}${style(['underline', 'overlined', 'bgWhiteBright'], `▎${medalDetail.fans_level}▕`)}${textColor[1]} ` : ` [${medalName}|${medalDetail.fans_level}]`;
        }
      }
    }

    const { outputContent, notifyMessage } = messageContentHandler(m);
    output.push(`${displaySendTime}${displayAt}${displayMemberRole}${displayMedalDetail}${colorDepth < 4 || (!displayMemberRole && !displayMedalDetail) ? ' ' : ''}${style(['bold', displaySenderColor], displaySenderName || '未知')} ${m.receiver_type === 2 ? '在' : '→'} ${style(['bold', displayReceiverColor], displayReceiverName || '未知')}${displayMessageSource}：${outputContent}`);

    if (m.sender_uid !== selfMid && notifyMessage) {
      if (sessionType === 2) {
        notifyObjects.push({ title: name || '未知', message: `${m.at_uids?.includes(selfMid) ? '[有人@你] ' : ''}${m.sender_uid === 0 ? '' : `${displaySenderName || '未知'}: `}${notifyMessage}`, icon: avatar });
      } else {
        notifyObjects.push({ title: displaySenderName || '未知', message: notifyMessage, icon: avatar && m.receiver_type === sessionType && m.sender_uid === talkerId ? avatar : m.sender_uid === 0 || (isSystem && sessionType === 1 && m.sender_uid === talkerId) ? null : usersInfo.get(m.sender_uid)?.face });
      }
    }
  }

  return { output, notifyObjects };
};
