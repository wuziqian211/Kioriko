# Kioriko

监听 B 站私信与应援团消息：在控制台显示消息、发送系统通知，并按命令或 AI 自动回复。

本目录由单文件版 `Kioriko v0.7.1.js` 拆分而来。各函数的逻辑与原文件相同，改动只有以下几类：拆成多个模块、去掉 REPL、合并三类重复代码，以及修正两处小问题。详见[与单文件版的差异](#与单文件版-v071-的差异)。

---

## 快速开始

**环境**：Node.js 24 及以上。代码用到了 `Promise.withResolvers`、`Object.groupBy`、`JSON.rawJSON`、`util.styleText` 等较新的 API。

**依赖**：`package.json` 沿用了原部署环境的依赖列表。运行时依赖是 md5、color-diff、image-size、is-wsl、node-notifier、openai；开发依赖是 ESLint 相关的包。在本目录下安装：

```sh
npm install
```

版本都写的是 `latest`，与原来一致。这意味着每次重新安装都可能装到新的大版本；如果某个包升级后改变了导出方式（例如 image-size），启动时就会报错。需要固定版本时，把 `latest` 改成具体的版本号即可。

**配置**：

- `configs/config.json` 是全局配置，`configs/userConfig/` 存放每个用户的配置，字段见[配置文件](#配置文件)。
- 这两个路径是相对于**运行目录**的，所以要在本目录下启动。
- 它们包含登录 Cookie、API 密钥和用户数据，已经写进 `.gitignore`，不会被提交到 Git。

**启动**：

```sh
node index.js
```

按 Ctrl+C 退出，退出前会先清除所有计时器。如果登录失败，程序会直接退出（退出码为 1）。

---

## 配置文件

### `configs/config.json`

| 字段 | 说明 |
| --- | --- |
| `AccountInfo.sessionData` | 登录 Cookie 中的 `SESSDATA` |
| `AccountInfo.csrfToken` | 登录 Cookie 中的 `bili_jct` |
| `AccountInfo.mid`、`deviceId`、`wbiKeys` | 由程序自动写入，无需手动填写 |
| `Timeout` | 轮询新消息的间隔（毫秒） |
| `AiInfo.baseUrl`、`apiKey` | AI 接口地址与密钥（OpenAI 兼容接口） |
| `AiInfo.model` | 调用的模型名 |
| `AiInfo.modelDisplayText` | 显示给用户的模型名 |
| `AiInfo.systemMessages` | 系统提示词数组，可以使用 `{name}`（用户昵称）和 `{modelDisplayText}` 占位符 |

`initialize()` 会把整个配置重新写回 `config.json`（加上 `mid`、`deviceId` 和 `wbiKeys`）。

### `configs/userConfig/{UID}.json`

每个用户一个文件，由程序自动创建。

| 字段 | 说明 |
| --- | --- |
| `definedCommands` | 用户自定义的命令：`[{ commandText, text, createdTimestamp, modifiedTimestamp }]` |
| `aiChat` | 是否开启了 AI 对话 |
| `aiMessages` | AI 对话的上下文 |
| `unrestricted` | 是否已经提示过对方 “现在可以发送其他消息了” |

---

## 目录结构

```
Kioriko/
├─ index.js                    入口：错误处理、启动、退出
├─ package.json
└─ src/
   ├─ index.js                 统一导出所有函数（给其他脚本用）
   ├─ runtime.js               运行时状态：runtime{config, timeDifference, …}、消息列表、计时器等
   ├─ constants.js             常量：消息来源、User-Agent、视频分区、稿件状态
   ├─ utils/                   纯工具函数（不依赖其他内部模块，log.js 除外）
   │  ├─ format.js             日期、时长、数字、长文本、字符串模板
   │  ├─ color.js              终端着色
   │  ├─ json.js               支持 BigInt 的 JSON 解析与序列化
   │  ├─ misc.js               exec、wait、ArrayFilterWithModifications
   │  ├─ id.js                 AV/BV 互转、解析编号类型（idParser）
   │  └─ log.js                timestamp、logError
   ├─ core/
   │  ├─ cache.js              内存缓存
   │  ├─ config.js             配置文件读写
   │  ├─ notify.js             系统通知
   │  ├─ poller.js             轮询新消息（fetchMessages）
   │  └─ lifecycle.js          initialize / uninitialize
   ├─ api/                     B 站接口
   │  ├─ sign.js               APP 签名、Wbi 签名
   │  ├─ client.js             公共请求头 headers、callAPI
   │  ├─ sync.js               校时、更新 Wbi 密钥
   │  ├─ user.js               用户信息、名片、搜索、改签名、官方账号
   │  ├─ video.js              视频信息
   │  ├─ group.js              应援团、成员、粉丝勋章
   │  ├─ relation.js           关注关系与关注分组
   │  ├─ session.js            会话信息
   │  ├─ image.js              fetchImageMeta、上传图片
   │  └─ actions.js            充电、批量点赞
   ├─ message/
   │  ├─ fetch.js              获取消息
   │  ├─ render.js             消息 → 控制台文本与通知内容
   │  └─ send.js               设置已读、发送消息
   ├─ autoreply/
   │  ├─ index.js              自动回复入口（autoReplyHandler）
   │  ├─ reply.js              发送自动回复（autoReply）
   │  ├─ waiting.js            等待用户回复（cancelWaiting、waitForReply）
   │  ├─ resolveUser.js        按昵称查找用户
   │  └─ commands/             内置命令，每个文件一个或几个命令
   │     ├─ index.js           命令表（commandList、findCommand）
   │     ├─ greeting.js        你好
   │     ├─ systemInfo.js      系统信息
   │     ├─ customCommand.js   自定义命令
   │     ├─ getInfo.js         获取信息
   │     ├─ relation.js        关系
   │     ├─ registerTime.js    注册时间
   │     ├─ profile.js         查成分
   │     ├─ aiSwitch.js        开启 / 重置 / 结束 AI 对话
   │     └─ staticReplies.js   中考成绩、帮助、关于
   └─ ai/
      ├─ chat.js               AI 对话循环
      └─ tools.js              AI 工具定义与执行
```

### 依赖规则

模块只能导入**同层或更下层**的模块，这样不会出现循环导入：

1. `utils/*`、`constants.js`、`runtime.js`
2. `core/cache.js`、`core/config.js`
3. `api/sign.js` → `api/client.js`
4. 其余 `api/*`、`core/notify.js`
5. `message/*`
6. `autoreply/*`、`ai/*`
7. `core/poller.js` → `core/lifecycle.js` → `index.js`

同层模块之间有几处导入：`api/group.js`、`api/relation.js` 依赖 `api/user.js`，`api/session.js` 依赖 `api/group.js` 和 `api/user.js`。新增导入时，请确认被导入的模块不会反过来导入当前模块。

---

## 运行流程

### 启动

`index.js` 调用 `initialize()`，依次执行以下步骤：

1. 读取 `config.json`。
2. 用 Cookie 请求 `/x/web-interface/nav`，验证登录状态。
3. 把 Cookie 写入公共请求头 `headers`，保存配置，创建 AI 客户端。
4. 启动 3 个计时器：
   - 每 `Timeout` 毫秒执行一次 `fetchMessages`
   - 每 1 小时校时一次（`updateTimeDifference`）
   - 每 1 小时更新一次 Wbi 密钥（`updateWbiKeys`）
5. 从接口更新官方账号的 UID 列表（`officialUids`）。

### 收到消息

`core/poller.js` 中的 `fetchMessages` 依次执行以下步骤：

1. 获取 “上次获取时间 − 5 秒” 之后有新消息的会话。
2. 获取每个会话的最近 50 条消息，筛出没有显示过、且是启动之后发送的消息。
3. `messagesHandler` 把消息转换成控制台文本和通知内容，然后输出到控制台并发送系统通知。
4. 对每条消息，先依次调用 `callbackFns` 里的函数（即正在等待用户回复的命令）。任何一个函数返回 `true` 时，就不再自动回复这条消息；否则交给 `autoReplyHandler`。

### 自动回复

`autoReplyHandler`（`autoreply/index.js`）会跳过以下消息：自己发送的、官方账号发送的、已撤回的，以及系统发送的。其余消息按类型处理：

- **文字消息**：
  1. 识别 at 自己的部分，然后去掉开头的指令符号 `# ＃ / >`。
  2. 用户自定义命令：消息原文与命令名完全一致时触发。
  3. 内置命令：第一个词与命令名一致时触发。
  4. AI 对话：用户开启了 AI 对话时触发。在应援团中必须 at 自己才会触发。
- **撤回消息**：取消这条消息触发的等待，并撤回对这条消息的自动回复。

真正发送回复的是 `autoReply`（`autoreply/reply.js`），它依次执行：

1. 把对方的消息设为已读。
2. 撤回 B 站自带的、2 分钟内发出的自动回复。
3. 给文字加上 `【自动回复】` 前缀（在应援团中还会 at 发送者），并按 660 字分段。
4. 逐条发送，每两条之间间隔 200 毫秒，并把发送结果记录到 `autoReplyMessages`。
5. 如果对方可能处于 “只能发送 1 条消息” 的受限状态，额外提示对方现在可以发送其他消息了。

---

## 关键约定

### 运行时状态（`runtime.js`）

`config`、`timeDifference`、`startRunningTime`、`lastTime`、`aiClient` 会被整体重新赋值，所以都放在 `runtime` 对象里，读写时统一写成 `runtime.config` 这种形式。

其他模块导入的变量是只读的，在导入方写 `config = …` 会报错。

只会原地修改（`push`、`length = 0` 等）的状态直接导出：`messages`、`shownMessages`、`autoReplyMessages`、`callbackFns`、`timerList`、`officialUids`。

### 缓存（`core/cache.js`）

缓存按 “类别 → 键” 分层存储：`setCache('User', mid, data)`、`getCache('User', mid)`。

已有的类别：`Session`、`User`、`Card`、`Video`、`VideoDetail`、`Group`、`GroupMemberRole`、`FansMedal`、`LocalPath`。

`get*` 系列函数会把超过 5 分钟的缓存视为过期，并重新请求；传入 `noCache = true` 可以强制重新请求。

### 请求接口（`callAPI`）

```js
const json = await callAPI(url, { method, params, headers, body, requiredKeys, retries, signal, includePlatformInfo, appSign, wbiSign });
```

- `GET`、`HEAD`、`OPTIONS` 请求默认最多尝试 3 次，其他方法默认只尝试 1 次。传入 `signal` 时只尝试 1 次。每次请求的超时时间为 10 秒。
- `POST` 等修改类请求会自动带上 csrf。`includePlatformInfo` 会加上 `build=0&mobi_app=web`。
- 永远返回一个对象。请求失败时返回 `{ code: -8888, message, data: null }`，所以调用方只需要判断 `json.code === 0`。

### 日志（`utils/log.js`）

错误日志统一使用 `logError`：

```js
logError('获取新消息时出错：', json);                 // [时间] 获取新消息时出错：message（code）
logError('获取登录信息时出错：', json, '，请重新尝试登录'); // 末尾追加文本
logError('请求出错：', { message: e.message });        // 没有 code 时不输出括号
```

普通日志仍然直接使用 `console.log`。时间前缀可以用 `timestamp()` 生成。

### 自动回复的消息格式

`autoReplyFn` 和 `autoReply` 接收一个消息数组：

```js
autoReplyFn([
  { msgType: 1, content: { content: '文字' } },                   // 文字，默认加 【自动回复】 前缀
  { msgType: 1, content: { content: '文字' }, autoReplyMark: false }, // 不加前缀
  { msgType: 1, content: { content: '文字' }, autoReplyMark: 'AI 回复' }, // 自定义前缀
  { msgType: 2, content: await fetchImageMeta(url) },              // B 站图床上的图片
  { msgType: 2, content: 'https://…' },                           // 其他图片（会自动下载并上传）
  { msgType: 5, content: msgKey },                                // 撤回消息
]);
```

---

## 常见维护任务

### 新增一个命令

1. 在 `src/autoreply/commands/` 下新建文件：

   ```js
   // src/autoreply/commands/ping.js
   export default {
     names: ['ping', '在吗'],
     async run({ senderUid, args, autoReplyFn }) {
       autoReplyFn([{ msgType: 1, content: { content: `pong ${args[1] ?? ''}` } }]);
     },
   };
   ```

2. 在 `commands/index.js` 中导入，并加到 `commandList` 里。

`run` 收到的上下文 `ctx` 的全部字段见 `autoreply/index.js` 开头的注释，常用的有：`senderUid`、`selfMid`、`talkerId`、`sessionType`、`args`、`userInput`、`autoReplyFn`。在命令中途结束时用 `return`。

### 需要用户进一步选择的命令

参考 `getInfo.js` 中的写法，使用 `waitForReply`：

```js
const choice = await waitForReply({
  talkerId, sessionType, senderUid, repliedMessageKey, selfMid,
  timeout: 30000,
  parse: text => (['1', '2'].includes(text) ? text : null), // 返回 null 表示继续等待
  onTimeout: async () => '1',                               // 超时后的默认值
});
```

用户回复的那条消息会被这次等待 “消费”，不会再触发自动回复。对方撤回触发这次等待的消息时，等待会被取消。

### 按昵称查找用户

```js
const uid = await resolveUser(name, '信息', autoReplyFn); // 找不到时已经回复过提示，返回 null
if (uid === null) return;
```

### 新增 B 站接口函数

按以下步骤添加：

1. 放进 `api/` 下对应的文件，或新建一个文件。
2. 按现有函数的写法编写：先用 `callAPI` 请求；需要缓存时用 `getCache`、`setCache`；出错时调用 `logError`。
3. 用 `export const` 导出。
4. 如果希望能在其他脚本中使用，把它加到 `src/index.js` 的导出列表里。这份列表需要手动维护。

### 新增 AI 工具

在 `ai/tools.js` 中做两处修改：

1. 在 `toolDefinitions` 里加上工具定义。
2. 在 `runTool` 里加一个同名的 `case`。返回值会被序列化后交给 AI。

### 手动调用函数（替代原来的 REPL）

写一个小脚本，用 `node` 运行：

```js
// scripts/like.js
import { initialize, uninitialize, likeUserDynamics } from '../src/index.js';

await initialize();
uninitialize(false); // 只保留登录信息，停止轮询消息，避免和正在运行的机器人重复回复
await likeUserDynamics(12345);
```

```sh
node scripts/like.js
```

也可以在本目录下直接运行 `node` 打开交互环境，再执行 `const k = await import('./src/index.js')`。

### 检查改动

```powershell
@(Get-Item index.js) + @(Get-ChildItem -Recurse -Filter *.js src) | ForEach-Object { node --check $_.FullName }
```

`node --check` 只能发现语法错误，发现不了 “忘记 import”。拆分时额外用 ESLint 的 `no-undef`（使用了未定义的变量）和 `no-unused-vars`（有多余的 import）检查过，结果为 0 个问题。以后改动较多时，建议也这样检查。

`package.json` 里已经有 ESLint 相关的开发依赖，但本目录还没有 `eslint.config.js`。把原来使用的 ESLint 配置放进来后，就可以运行 `npx eslint .`。

---

## 与单文件版 v0.7.1 的差异

### 结构

- 按上面的目录拆分。`autoReplyHandler` 中原来那个很大的 `switch` 拆成了 `autoreply/index.js`（分发）、`commands/*`（每个命令一个文件）和 `ai/*`（AI 对话与工具）。
- 视频分区表与稿件状态表移到了 `constants.js`，改名为 `videoZones` 和 `videoStates`。User-Agent 改为共用常量 `USER_AGENT`。
- 会被整体重新赋值的状态改为 `runtime.xxx`（见上文）。

### 删除

- REPL 及暴露给 REPL 的上下文。
- `internalEval`：它只给 REPL 使用；而且拆成多个模块后，`eval` 也访问不到其他模块的变量。

### 合并的重复代码

| 新函数 | 替换的内容 | 处数 |
| --- | --- | --- |
| `logError`（`utils/log.js`） | `[时间] 标题：message（code）` 格式的错误日志 | 33 |
| `fetchImageMeta`（`api/image.js`） | 下载图片后用 `sizeOf` 读取尺寸，再拼成图片消息 | 5 |
| `resolveUser`（`autoreply/resolveUser.js`） | “获取信息”“注册时间”“查成分” 中按昵称查找用户的代码 | 3 |

`relation.js` 中 “操作失败的用户” 那条错误日志的格式不同（没有 message 和 code），所以保持原样。

### 行为变化（两处小修正）

1. **`sendMessage` 发送 B 站图床上的图片时，`size` 由字节改为 KB。** 原代码只有这一处使用字节，其他图片消息和消息显示都按 KB 处理。现在它统一由 `fetchImageMeta` 生成。
2. **对方撤回消息时，只取消与被撤回消息对应的等待。**
   - 原代码会清除该用户在该会话中**所有**等待的超时计时器，但只从 `callbackFns` 中移除了被撤回消息对应的那一个。
   - 其他等待因此失去了超时计时器：如果用户一直不回复，它们就会一直挂着。

其余逻辑与 v0.7.1 相同。

---

## 函数位置对照

| 文件 | 导出 |
| --- | --- |
| `runtime.js` | `runtime`、`timerList`、`callbackFns`、`messages`、`shownMessages`、`autoReplyMessages`、`officialUids`、`getCurrentTime` |
| `constants.js` | `messageSources`、`USER_AGENT`、`videoZones`、`videoStates` |
| `utils/format.js` | `getDate`、`getTime`、`getNumber`、`longTextHandler`、`formatString` |
| `utils/color.js` | `trueColorToSupportedColor`、`style`、`colorEmote` |
| `utils/json.js` | `JSONParse`、`JSONStringify` |
| `utils/misc.js` | `exec`、`wait`、`ArrayFilterWithModifications` |
| `utils/id.js` | `toBV`、`toAV`、`idParser` |
| `utils/log.js` | `timestamp`、`logError` |
| `core/cache.js` | `updatedTimestampSymbol`、`cachedData`、`getCache`、`getCategoryCache`、`setCache` |
| `core/config.js` | `loadConfig`、`saveConfig`、`loadUserConfig`、`saveUserConfig` |
| `core/notify.js` | `convertToLocalPath`、`notify` |
| `core/poller.js` | `fetchMessages` |
| `core/lifecycle.js` | `initialize`、`uninitialize` |
| `api/sign.js` | `appSign`、`encodeWbi` |
| `api/client.js` | `headers`、`callAPI` |
| `api/sync.js` | `updateTimeDifference`、`updateWbiKeys` |
| `api/user.js` | `getBilibiliUid`、`getOfficialUids`、`getUserInfo`、`getUsersInfo`、`getUserCard`、`searchUsers`、`updateSign` |
| `api/video.js` | `getVideoInfo`、`getVideoDetail` |
| `api/group.js` | `getGroupInfo`、`getMyGroups`、`getMembersList`、`getMembersRole`、`getFansMedal`、`getFansMedalByGroupId`、`joinGroup` |
| `api/relation.js` | `getUserStat`、`getUsersStat`、`getUserRelation`、`getUsersRelation`、`modifyUserRelation`、`modifyUsersRelation`、`getRelationTagsList`、`getUserRelationTags`、`modifyUsersRelationTags`、`copyUsersTo`、`moveUsersFrom`、`follow`、`unfollow`、`specialFollow` |
| `api/session.js` | `getSessionInfo`、`getSessionDetail` |
| `api/image.js` | `fetchImageMeta`、`uploadImage` |
| `api/actions.js` | `charge`、`likeUserDynamics` |
| `message/fetch.js` | `getMessages`、`getAllMessages` |
| `message/render.js` | `messageContentHandler`、`messagesHandler` |
| `message/send.js` | `ackMessage`、`sendMessage` |
| `autoreply/index.js` | `autoReplyHandler` |
| `autoreply/reply.js` | `autoReply` |
| `autoreply/waiting.js` | `cancelWaiting`、`waitForReply` |
| `autoreply/resolveUser.js` | `resolveUser` |
| `autoreply/commands/index.js` | `commandList`、`findCommand` |
| `ai/chat.js` | `aiChat` |
| `ai/tools.js` | `toolDefinitions`、`runTool` |
