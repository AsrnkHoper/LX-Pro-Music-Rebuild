# 🔍 LX-Pro-Music 界面调研报告
> 仓库：`https://github.com/AsrnkHoper/LX-Pro-Music`（已下载到 `/sdcard/Hoper/LX_Pro`）
> 技术栈：React Native + TypeScript
> 目的：**只分析界面与信息结构**，为 LX_Pro_Rebuild 的空间化重构提供依据

---

## 一、项目结构速览

```
src/
├── screens/          页面（11 个）
├── components/       通用组件 + 播放器组件
├── navigation/       路由与页面注册
├── theme/            主题与配色（Material Colors + 自定义）
├── store/            状态（player / list / common / setting / theme / search）
├── core/             业务核心（player / list / search / common）
├── plugins/          播放器与歌词插件
└── config/           常量（NAV_MENUS / 组件ID / 默认设置）
```

---

## 二、页面清单（11 个）

| 页面 | 文件 | 说明 |
|---|---|---|
| **HomeScreen** | `screens/Home` | 主壳层：抽屉导航 + 内容区 + 迷你播放条 |
| **PlayDetailScreen** | `screens/PlayDetail` | 播放详情（竖屏 / 横屏 / 全屏沉浸 三套布局） |
| **SonglistDetailScreen** | `screens/SonglistDetail` | 歌单详情 |
| **AlbumDetailScreen** | `screens/AlbumDetail` | 专辑详情 |
| **ArtistDetailScreen** | `screens/ArtistDetail` | 歌手详情 |
| **CommentScreen** | `screens/Comment` | 评论（热门 / 最新） |
| **SimilarSongsScreen** | `screens/SimilarSongs` | 相似歌曲 |
| **DownloadManagerScreen** | `screens/DownloadManager` | 下载管理 |
| 弹窗 | `VersionModal / PactModal / SyncModeModal` | 版本 / 协议 / 同步模式 |

---

## 三、主壳层（HomeScreen）

### 3.1 整体布局（竖屏）

```
┌──────────────────────────────┐
│ ☰  页面标题        🔍全局搜索 │ ← Header
├──────────────────────────────┤
│                              │
│        内容区（PagerView）    │ ← 17 种视图切换
│                              │
├──────────────────────────────┤
│ ◉ 歌名 - 歌手      ▶ ⏭       │ ← PlayerBar（迷你播放条）
│ ▬▬▬▬▬▬░░░░░░░░░░░░           │    内含迷你进度条
└──────────────────────────────┘
```

### 3.2 抽屉导航（14 项，`NAV_MENUS`）

| 菜单 ID | 图标 | 含义 |
|---|---|---|
| `nav_home` | home | 主页 |
| `nav_search` | search-2 | 搜索 |
| `nav_play_history` | music_time | 播放历史 |
| `nav_songlist` | album | 歌单（网络歌单） |
| `nav_top` | leaderboard | 排行榜 |
| `nav_love` | love | 我的收藏（**可折叠**，展开显示所有自建歌单，可上下移动排序） |
| `nav_daily_rec` | calendar | 每日推荐 |
| `nav_followed_artists` | artist | 关注的歌手 |
| `nav_subscribed_albums` | album-disc | 订阅的专辑 |
| `nav_my_playlist` | album | 我的歌单 |
| `nav_onedrive` | onedrive | OneDrive |
| `nav_webdav` | webdav | WebDAV |
| `nav_stats` | stats | 听歌统计 |
| `nav_setting` | setting | 设置 |

> 支持**左右滑动打开抽屉**、**手势返回**、**返回键二次确认退出**

### 3.3 内容区（17 种视图）

| 视图 | 目录 | 核心信息 |
|---|---|---|
| **Home** | `Views/Home` | 问候语 + 今日统计（时长/次数）+ 我的歌单列表 + 搜索框 + 搜索历史 |
| **Search** | `Views/Search` | 搜索框 + 历史词 + 搜索类型选择（音乐/歌单/歌手/专辑）+ 结果列表 |
| **SongList** | `Views/SongList` | 标签筛选（分类/排序）+ 歌单列表 |
| **Leaderboard** | `Views/Leaderboard` | 排行榜列表（榜单名 + 封面） |
| **Mylist** | `Views/Mylist` | 我的列表（左侧列表 + 右侧歌曲列表） |
| **DailyRec** | `Views/DailyRec` | 日期 + 每日推荐歌曲列表 |
| **FollowedArtists** | `Views/FollowedArtists` | 歌手列表（头像 + 名字） |
| **SubscribedAlbums** | `Views/SubscribedAlbums` | 专辑网格（封面 + 名字 + 歌手） |
| **MyPlaylist** | `Views/MyPlaylist` | 我的歌单列表 |
| **PlayHistory** | `Views/PlayHistory` | 按日期分组的历史记录 |
| **Stats** | `Views/Stats` | 听歌统计（时长/次数/排行图表） |
| **Setting** | `Views/Setting` | 分组设置项 |
| **Download** | `Views/Download` | 下载列表 |
| **OneDrive / WebDAV** | `Views/OneDrive` `Views/WebDAV` | 网盘文件浏览 |
| **Oobe** | `Views/Oobe` | 首次启动引导 |

### 3.4 迷你播放条（PlayerBar）

| 元素 | 信息 |
|---|---|
| Pic | 专辑封面（可设透明度） |
| Title | 歌名（跑马灯滚动） |
| PlayInfo | 迷你进度条 |
| ControlBtn | 播放/暂停、下一首 |
| Status | 状态文字 |

**手势**：点击→进播放详情；上滑→打开播放队列；长按→跳转到当前列表位置；横滑→打开抽屉

---

## 四、播放详情页（PlayDetail）★重点

### 4.1 竖屏布局

```
┌──────────────────────────────┐
│ ⌄   歌名（跑马灯）      ⋯     │ ← Header
│     歌手 / 专辑（可点击）      │
├──────────────────────────────┤
│                              │
│      ┌──────────────┐        │
│      │              │        │
│      │   专辑封面    │        │ ← 第 1 页：封面
│      │  （可旋转）   │        │
│      └──────────────┘        │
│                              │
│      迷你歌词（一行，底部）    │ ← 点击切到歌词页
├──────────────────────────────┤
│  ──────●──────────────       │ ← 进度条（带缓冲进度）
│  01:14    状态文字    03:37   │ ← 当前时间 / 状态 / 总时长
│                              │
│      ⏮      ▶      ⏭        │ ← 播放控制
│                              │
│  🔁   ➕   💬   ⬇   ⋯        │ ← 更多按钮行
└──────────────────────────────┘
```

**第 2 页：全屏歌词**（左右滑动切换）

### 4.2 更多按钮行（MoreBtn）

| 按钮 | 功能 |
|---|---|
| 播放模式 | 列表循环 / 随机 / 顺序 / 单曲循环 / 心动 / 禁用 |
| 添加到歌单 | 弹出歌单选择 |
| 桌面歌词 | 开关 |
| 评论 | 跳转评论页 |
| 更多 ⋯ | 弹出完整菜单 |

### 4.3 播放详情菜单（PlayDetailMenu）

**歌曲操作**：播放 / 下一首播放 / 收藏 / 下载 / 评论 / 相似歌曲 / 查看歌手 / 查看专辑 / 分享 / 不喜欢 / 歌曲来源详情 / 定时退出

### 4.4 播放设置弹窗（SettingPopup）6 项

| 设置 | 说明 |
|---|---|
| 封面旋转 | 开关 |
| 歌词对齐 | 左/中/右 |
| 歌词字号 | 滑块 |
| 歌词进度 | 开关 |
| 播放倍速 | 滑块 |
| 音量 | 滑块 |

### 4.5 横屏 / 全屏沉浸模式

- **Horizontal**：左侧封面 + 右侧歌词 + 底部控制
- **LandscapeImmersion**：全屏沉浸，仅封面/歌词 + 极简控制

---

## 五、其他页面信息结构

### 5.1 歌单详情 / 专辑详情 / 歌手详情

```
┌──────────────────────────────┐
│ ←  标题                       │
├──────────────────────────────┤
│  ┌────┐  歌单名               │ ← Header
│  │封面│  作者 · 播放量 · 简介  │
│  └────┘  [播放全部] [收藏]     │
├──────────────────────────────┤
│  ▢ 歌名 - 歌手      03:42  ⋯  │ ← 歌曲列表
│  ▢ 歌名 - 歌手      04:11  ⋯  │
└──────────────────────────────┘
```

**歌手详情**额外有：专辑列表、相似歌手弹窗
**专辑详情**：专辑信息 + 歌曲列表

### 5.2 评论页

- 顶部：热门 / 最新 切换
- 评论项：头像 + 昵称 + 时间 + 内容 + 图片 + 点赞数 + 楼层回复
- 底部：评论输入框

### 5.3 下载管理

- 顶部：标题 + 批量操作
- 列表项：封面 + 歌名 + 歌手 + 状态（等待/下载中/已完成/失败）+ 进度 + 操作按钮

---

## 六、组件库与主题

### 6.1 通用组件（29 个）

```
Icon / SvgIcon / Text / Image / ScaledImage / ImageBackground
Button / ButtonPrimary / CheckBox / Input / Slider
Menu / Popup / Modal / Dialog / ConfirmAlert / DorpDownMenu / DorpDownPanel
Loading / LoadingMask / Badge / PlayingIcon
DrawerLayoutFixed / AnimatedSlideUpPanel / ImagePreviewModal
FileSelect / ChoosePath / StatusBar
```

### 6.2 主题

- `theme/Colors.js` — Material Design 完整色板
- `theme/themes` — 亮色/暗色主题
- 主题键：`c-font` / `c-font-label` / `c-primary` / `c-500` …

---

## 七、信息层级总结

| 层级 | 内容 |
|---|---|
| **L1 全局** | 抽屉导航（14 项）、迷你播放条、全局搜索 |
| **L2 视图** | 17 种内容视图（列表 / 网格 / 筛选 / 统计） |
| **L3 详情** | 歌单 / 专辑 / 歌手 / 评论 / 相似歌曲 / 下载 |
| **L4 播放** | 封面 ⇄ 歌词 双页、进度、控制、更多、设置 |
| **L5 弹窗** | 菜单、歌单选择、相似歌曲、设置、确认框 |

---

## 八、对重构的启示

1. **导航层级很深**（抽屉 14 项 × 每个视图又有子页），需要一种**不迷路的空间导航方式**
2. **播放详情是双页结构**（封面 / 歌词）——天然适合"空间切换"
3. **列表是绝对主力**（歌单、专辑、歌手、评论、历史、下载…）——必须有**空间化的列表控件**
4. **操作菜单很密集**（歌曲菜单 12 项）——适合做成**环绕式操作环**
5. **设置项成组**（播放设置 6 项）——适合做成**悬浮设置面板**
