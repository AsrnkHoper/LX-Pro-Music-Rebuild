# 🔍 LX-Pro 界面分析与重构方案

> 分析对象：`~/Hoper/LX_Pro_FinalRebuild_0922`（React Native 版 LX-Pro-Music，main @ `13139f146d22`）
> 重构目标：`LX_Pro_Rebuild_UI/prototype/app.html`（Three.js 球面空间原型）
> 日期：2026-09-22 ｜ 依据：源码逐文件分析（带 文件:行号）

---

## 〇、结论先行

**主页不动。** 现有 6 张功能卡恰好是「本地功能」的完整集合，与 LX-Pro 的本地功能一一对应，且已排除全部第三方平台入口。

**重构集中在子空间**，共 4 处值得移植，按价值排序：

| 优先级 | 重构项 | 价值 |
|---|---|---|
| **P0** | 听歌统计：6 种图表体系 | 现有只有「大数字+柱状图」，差距最大 |
| **P1** | 播放页：迷你歌词（封面下悬浮当前句） | 小改动、大观感 |
| **P2** | 我的列表：左右分栏联动的细化 | 现有思路已对，可补细节 |
| **P3** | 播放页：更多按钮行 + 播放设置弹窗 | 对应 docs/09 的 P3 计划 |

---

## 一、LX-Pro 的导航菜单全清单（含数据源判定）

`src/config/constant.ts:116-132`（`download` 项被注释掉）

| # | id | 中文名 | 数据源 | 依赖 | 本项目 |
|---|---|---|---|---|---|
| 1 | `nav_home` | 主页 | 本地 | — | ✅ |
| 2 | `nav_search` | 搜索 | 混合 | 音源 | ✅ |
| 3 | `nav_play_history` | 播放历史 | **本地** | `getPlayHistoryByRange` | ✅ |
| 4 | `nav_love` | **我的列表** | **本地自建** | `utils/listManage` | ✅ |
| 5 | `nav_songlist` | 歌单 | ⚠️ **第三方广场** | `core/songlist.ts` + 音源 | ❌ |
| 6 | `nav_top` | 排行榜 | ⚠️ **第三方** | `core/leaderboard.ts` + 音源 | ❌ |
| 7 | `nav_daily_rec` | 每日推荐 | ⚠️ 平台推荐 | 音源 | ❌ |
| 8 | `nav_followed_artists` | 关注的歌手 | ⚠️ 需登录 | `wyApi.getAllSublist` | ❌ |
| 9 | `nav_subscribed_albums` | 收藏的专辑 | ⚠️ 需登录 | `wyApi.getAllSubAlbumList` | ❌ |
| 10 | `nav_my_playlist` | 我的歌单 | ⚠️ 需登录 | `wyApi.getUserPlaylists`（cookie+uid） | ❌ |
| 11 | `nav_onedrive` | OneDrive | ⚠️ 网盘 | `core/oneDrive/` | ❌ |
| 12 | `nav_webdav` | WebDAV | ⚠️ 网盘 | `core/webdavMusic/` | ❌ |
| 13 | `nav_stats` | 听歌统计 | **本地** | `core/stats/` | ✅ |
| — | `nav_setting` | 设置 | 本地 | — | ✅ |

### ⚠️ 最容易搞混的一处

| 名称 | id | 是什么 | 数据来源 |
|---|---|---|---|
| **「我的列表」** | `nav_love` | **本地自建歌单**（用户自己建/收藏进本地库） | `getUserLists` / `getListMusics`（`core/list.ts:219`）→ **不依赖任何平台** |
| **「我的歌单」** | `nav_my_playlist` | **网易云账号里的歌单** | `wyApi.getUserPlaylists(uid, cookie)`（`Views/MyPlaylist/index.tsx:82`）→ **需登录** |

> **本项目的「我的歌单」卡片 = LX-Pro 的 `nav_love`「我的列表」**，不是 `nav_my_playlist`。
> 现有原型的 `PLAYLIST_DATA`（本地自建歌单 + 本地歌曲）正是这个语义，**命名可保留**，但内部逻辑对齐 `nav_love`。

---

## 二、现有 6 张卡 vs LX-Pro 对照（结论：主页不动）

| Rebuild_UI 卡片 | LX-Pro 对应 | 判定 |
|---|---|---|
| 当前播放 | `PlayDetail` | ✅ 保留 |
| 搜索 | `nav_search` | ✅ 保留 |
| 我的歌单 | `nav_love`（本地列表） | ✅ 保留 |
| 听歌统计 | `nav_stats` | ✅ 保留 |
| 下载管理 | `nav_download`（源码中被注释） | ✅ 保留（合理：本地功能） |
| 设置 | `nav_setting` | ✅ 保留 |
| ~~播放历史~~ | `nav_play_history` | 已删（2026-09-22） |

**结论**：6 张卡 = 本地功能全集，**无一张第三方平台卡**。主页方位（60° 均匀环绕）、尺寸、绘制**均不需要改动**。

> ⚠️ 若将来要加，只应从「本地功能」里选（如「我的列表」若与「我的歌单」合并则无需新增）。

---

## 三、P0 — 听歌统计：6 种图表体系

**LX-Pro 实现**：`src/screens/Home/Views/Stats/index.tsx`（3626 行）+ 独立图表组件，全部用 `react-native-svg` 手绘。

### 3.1 六个图表（含实现要点）

| # | 图表 | 文件 | 数据维度 | 视觉要点 |
|---|---|---|---|---|
| 1 | **24 小时柱状图** | `Stats/index.tsx:721-740` | 各小时听歌次数 | 柱高按最大值归一化到 64px；**最高峰用主色高亮** |
| 2 | **活跃对比折线图** | `ActivityCompareChart.tsx` | 本月 vs 上月（或今年 vs 去年） | `Polyline`；**本月实线、上月虚线** |
| 3 | **六维雷达图** | `RadarChart.tsx` | 见下表 | `Polygon` + 网格；支持日/周/月/年切换 |
| 4 | **平台占比环形图** | `DonutChart.tsx:15,22,52-60` | 各音源收听时长占比 | `strokeWidth = size*0.14`；中心显示累计时长；右侧图例带百分比 |
| 5 | **月/年热力图** | `MonthHeatMap.tsx` + `YearOverview.tsx:177-221` | 每日时长 | GitHub 风格色格；年视图支持**柱状/热力双模式** |
| 6 | **排行列表** | `Stats/index.tsx:870-931` | 歌曲/歌手/专辑 Top10 | 次数排行 + 时长排行两套 |

### 3.2 雷达图 6 个维度（`Stats/index.tsx:71-76`）

| 维度 | 计算式 | 含义 |
|---|---|---|
| 多样性 | `songAgg.size / eventCount` | 听歌面有多广 |
| 深夜 | `lateNightCount / eventCount` | 深夜听歌占比 |
| 循环 | `topSong.plays / eventCount` | 是否爱单曲循环 |
| 完听 | `completionAvg` | 平均听完比例 |
| 活跃 | `activeDays / daysInPeriod` | 活跃天数占比 |
| 探索 | `firstInRange / songAgg.size` | 新歌占比 |

### 3.3 其他统计块（`Stats/index.tsx:640-966`）

- **Hero 卡**：累计时长 / 有效次数 / 活跃天数
- **本月报告**：本月时长 / 次数 / 活跃天 / 今年活跃
- **本月最常听**：最爱歌手 / 歌曲 / 专辑（带次数）
- **听歌习惯**：常听时段 / 活跃日均 / 最长连续 / 本月活跃%
- **长期偏好**：常听歌手 / 专辑 / 音源
- **最近播放**：最近 8 条

### 3.4 重构到空间里（方案）

现有 `stats` 空间是**竖列布局**（`stat` + `bars` × 2）。改造成**环绕多焦点**：

```
                    ┌─────────────┐
    [今日/本月 Hero] │  24h 柱状图  │ [六维雷达图]
                    └─────────────┘
       az 0°            az 0°           az 60°
                    ┌─────────────┐
      [环形图]       │  排行列表    │ [热力日历]
                    └─────────────┘
       az -60°          az 0°           az 120°
```

- **正面**：Hero 大数 + 24 小时柱状图（最常看）
- **右转**：六维雷达图 + 环形图（画像类）
- **左转**：排行列表（歌曲/歌手）
- **下转**：热力日历（月度）

**需要新增控件**（`DRAW` 里加）：
| 控件 | 用途 | 难点 |
|---|---|---|
| `chart_bar24` | 24 小时柱状图 | 低（现有 `stat` 的 bars 可扩展） |
| `chart_radar` | 六维雷达图 | 中（多边形 + 网格绘制） |
| `chart_donut` | 环形图 | 中（`arc` + 图例） |
| `chart_heat` | 热力日历 | 中（网格 + 色阶） |
| `chart_line` | 折线对比 | 中（`moveTo/lineTo` + 虚线） |

---

## 四、P1 — 播放页迷你歌词

**LX-Pro 实现**：`PlayDetail/Vertical/index.tsx:88-96`
- 封面页（第 0 页）底部悬浮当前歌词，位置 `bottom: 6%`、左右 `10%`（`:124-130`）
- 组件 `components/MiniLyric.tsx`：取当前行 `line.text`（`:19-28`）+ 首条翻译 `extendedLyrics[0]`（`:26`），字号固定 `13`，对齐读 `playDetail.style.align`

**重构方案**：
- 在 `now` 空间的 `cover` 控件下方加一行迷你歌词
- 复用现有 `lyric3d` 的**当前行索引**（`NP.lyricIdx`），取当前句文本绘制
- 现有布局（`docs/11` 第六节 D）：`cover` sf 0.76 / sv 0.39，`nowinfo` sf 0.76 / sv 0.485
- **新增** `minilyric` 控件插在 `cover` 与 `nowinfo` 之间（约 sv 0.45）

**歌词三态色值（LX-Pro `Vertical/Lyric.tsx:82-87`）**：
```js
active   → [theme['c-font'] 或 c-primary-font-active, c-primary-alpha-200, opacity 1]
inactive → [c-450, c-400, opacity 0.8]
```
> ⚠️ **不要照抄**：LX-Pro 是「当前行 + 其余行」两态；本原型 `lyric3d` 已实现**四态衰减**
> （距离 0/±1/±2/≥3 → 透明度 0.97/0.44/0.22/0.10，见 `docs/07`），**更细腻，保留原样**。

---

## 五、P2 — 我的列表：左右分栏联动

**LX-Pro 实现**：`Views/Mylist/index.tsx`（4964 行）
- **左栏** `MyList/List.tsx`：列表清单（名称 + 数量 + 更多菜单），点击 → `setActiveList(id)`
- **右栏** `MusicList/List.tsx`：当前列表的歌曲（`FlatList`，支持多列 `numColumns`）
- **联动**：`mylistToggled` 事件（`List.tsx:191-198`）；左栏选中 → 右栏重新加载
- **右栏顶部** `ActiveList.tsx:63-90`：当前列表名 + 收藏图标 + **切换封面/列表视图** + 搜索按钮

**歌曲项字段**（`MusicList/ListItem.tsx:108-154`）：
序号或封面 → 歌名+别名 → **徽章行**（音源 / 音质 hires·flac·320k / VIP）→ 歌手（可拼专辑）→ 时长 → 更多按钮

**现有原型已实现的部分**：
- `tabs`(分类) + `grid`(歌单网格) + `songrow`(歌曲列表) 环绕同屏 ✅
- 点 `grid` 单元格 → `updateSongList()` 换右侧歌曲 ✅
- 这就是「左右分栏联动」的空间版 ✅

**可补的细节**：
1. **徽章行**：`songrow` 里给歌名后加音源/音质小标签（现有只有序号+歌名+歌手+时长）
2. **视图切换**：LX-Pro 有「封面/列表」两种视图 → 可做成 `tabs` 的一个切换项
3. **列表顶部信息**：`songrow` 的 label 已显示「歌单名 · N 首」，可再加「收藏」图标位

---

## 六、P3 — 播放页：更多按钮 + 设置弹窗

### 6.1 更多按钮行（`MoreBtn/index.tsx:123-127`）

5 个按钮，`space-around` 排列：

| # | 按钮 | 功能 | 本项目要吗 |
|---|---|---|---|
| 1 | `DesktopLyricBtn` | 桌面歌词开关（短按切换/长按设置） | ⚠️ 移动端概念，可略 |
| 2 | `MusicAddBtn` | 添加到歌单 | ✅ |
| 3 | `PlayModeBtn` | 播放模式（列表循环/随机/单曲/顺序…） | ✅ |
| 4 | `CommentBtn` | 评论（OneDrive 歌曲隐藏） | ❌ 需平台 |
| 5 | `dots-vertical` | 更多菜单 | ✅ |

### 6.2 播放详情菜单（`components/PlayDetailMenu.tsx:66-85`）

**动态构建**，按音源/设置条件显示：

| 操作 | 条件 | 本项目 |
|---|---|---|
| 下载 | 非 OneDrive | ✅ |
| 复制歌名 | `menuSetting.share` | ✅ |
| 喜欢 / 取消喜欢 | 仅 `source==='wy'` | ⚠️ 可做本地版 |
| 歌手详情 | 仅 `wy` | ❌ |
| 专辑详情 | 仅 `wy` | ❌ |
| 相似歌曲 | 仅 `wy` | ❌ |
| 播放 MV | 有 MV 且开启 | ❌ |
| 歌曲来源详情 | 非 local 且开启 | ⚠️ |

> **本项目应保留**：下载 / 复制歌名 / 喜欢（本地）/ 歌曲来源详情 —— 共 4 项，去掉全部平台依赖项。

### 6.3 播放设置弹窗（`components/SettingPopup/`）

| 设置 | 控件 | 本项目 |
|---|---|---|
| 歌词字号 | `Slider`（`:86-95`） | ✅ |
| 歌词对齐 | 左/中/右 三选（`:104-110`，`LRC_ALIGN` `:38-40`） | ✅ |
| 显示控制栏 | `Switch`（`:120`） | ✅ |
| 封面旋转 | 见 `Pic.tsx:31-38`（25 秒/圈） | ✅ |

> 对应 `docs/09` 的 P3「下转=播放设置」，用 `opring` / `slider` 控件实现。

---

## 七、明确不移植的清单（避免误加）

| 项 | 原因 |
|---|---|
| 歌单广场 `nav_songlist` | 第三方平台内容 |
| 排行榜 `nav_top` | 第三方平台内容 |
| 每日推荐 `nav_daily_rec` | 平台推荐算法 |
| 关注的歌手 / 收藏的专辑 / 我的歌单 | 全部需登录网易云账号（cookie+uid） |
| OneDrive / WebDAV | 网盘功能 |
| 评论 `CommentScreen` | 需平台评论接口 |
| 相似歌曲 `SimilarSongs` | 需平台接口 |
| 播放 MV / VideoPlayer | 需平台 |
| YouTube / Web 登录（`YouTubeLoginModal` 等） | 平台账号体系 |
| OOBE 引导 | 原型不需要 |

---

## 八、实施建议顺序

| 阶段 | 内容 | 新增控件 |
|---|---|---|
| **① P1** | 迷你歌词（改动小，先验证流程） | `minilyric` |
| **② P0** | 统计图表体系（价值最大） | `chart_bar24` / `chart_radar` / `chart_donut` / `chart_heat` |
| **③ P2** | 我的列表细节（徽章行 / 视图切换） | 扩展 `songrow` |
| **④ P3** | 更多按钮 + 设置弹窗 | `opring` / `slider` |

> **建议从 P1 开始**：改动最小、能立刻看到效果，且能验证「LX-Pro → 空间化」的翻译方法是否顺手。
> 之后再啃 P0（图表需要新的绘制函数，工作量大）。

---

## 九、源码索引（快速定位）

| 内容 | 文件 |
|---|---|
| 导航菜单定义 | `src/config/constant.ts:116-132` |
| 中文名映射 | `src/lang/zh-cn.json:178-631` |
| 主页视图 | `src/screens/Home/Views/Home/index.tsx:195-300` |
| 顶栏 | `src/screens/Home/Vertical/Header.tsx:30-152` |
| 抽屉导航 | `src/screens/Home/Vertical/DrawerNav.tsx:241-343` |
| 迷你播放条 | `src/components/player/PlayerBar/index.tsx:99-117` |
| 播放页竖屏 | `src/screens/PlayDetail/Vertical/index.tsx:78-108` |
| 播放页更多按钮 | `src/screens/PlayDetail/Vertical/Player/components/MoreBtn/index.tsx:123-127` |
| 播放详情菜单 | `src/screens/PlayDetail/components/PlayDetailMenu.tsx:66-85` |
| 播放设置弹窗 | `src/screens/PlayDetail/components/SettingPopup/` |
| 歌词（三态） | `src/screens/PlayDetail/Vertical/Lyric.tsx:74-100` |
| 我的列表 | `src/screens/Home/Views/Mylist/index.tsx` |
| 歌曲项字段 | `src/screens/Home/Views/Mylist/MusicList/ListItem.tsx:108-154` |
| 听歌统计 | `src/screens/Home/Views/Stats/index.tsx` |
| 雷达图 | `src/screens/Home/Views/Stats/RadarChart.tsx` |
| 环形图 | `src/screens/Home/Views/Stats/DonutChart.tsx:15` |
| 主题色 | `src/theme/themes/createThemes.js`（16 套主题） |
| 字号常量 | `src/theme/Typography.js:23-51` |

---

## 十、附：LX-Pro 的主题与字号（供参考，不照搬）

**唯一暗色主题** `black`「黑灯瞎火」（`createThemes.js:217-235`）：
- `primary = rgb(190,190,190)`、`font = rgb(255,255,255)`
- `c-main-background = rgba(19,19,19,0.95)`

**字号常量**（`Typography.js:23-39`）：Heading 32 / SubHeading 24 / Label 20 / Body 16 / Caption 14
**圆角** `BorderRadius.normal = 4`（`:49-51`）

> ⚠️ **不要照搬**：本原型已有自己的色彩体系（`#08090C` 中性灰黑 + `#7A828C`，见 `docs/11` 第七节）
> 与更大的圆角/字号。LX-Pro 的色值仅供参考对照。
> 另注：LX-Pro 的 `FontSizes` 常量**在新代码里并未普遍遵循**（大量硬编码数字），不值得模仿。
