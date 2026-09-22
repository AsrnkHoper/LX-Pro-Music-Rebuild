# 📋 LX-Pro 界面覆盖审计

> 日期：2026-09-22 ｜ 方法：逐项核对 LX-Pro 源码与 Rebuild 实际代码（非凭印象）
> 分析对象：`~/Hoper/LX_Pro_FinalRebuild_0922`（main @ `13139f146d22`）
> 实现对象：`prototype/app.html`（5482 行）

---

## 〇、结论（2026-09-22 更新）

**主要缺口已补齐。** 本轮（P0~P3 + 设置页 + 详情页 + 搜索页）完成后的状态：

| 类别 | 数量 | 说明 |
|---|---|---|
| ✅ **已完整重构** | **16 项** | 主页/搜索/歌单/统计/播放页/设置页/专辑/歌手/歌单详情 |
| 🟡 只有简版 | 1 项 | 下载管理（LX-Pro 396 行 → 3 控件） |
| ❌ 有意不移植 | 14 项 | 第三方平台 / 网盘 / 登录类 + 横屏（用户明确不做） |
| 🔀 空间化改造 | 4 项 | 设计不同但**非遗漏**（双页→同屏、抽屉→球面） |

**本轮补齐的项**（审计时还是 🟡/⬜）：

| 项 | 审计时 | 现在 |
|---|---|---|
| 搜索页（4 类型切换） | 🟡 简版 | ✅ |
| 设置页（7 分区） | 🟡 极简（4 控件） | ✅（10 控件） |
| 专辑详情 | ⬜ 未做 | ✅ |
| 歌手详情 | ⬜ 未做 | ✅ |
| 歌单详情 | 🟡 部分 | ✅ |
| 我的列表细节（音源徽章） | 🟡 部分 | ✅ |
| 横屏 / 沉浸模式 | ⬜ 未做 | ❌ **用户明确不做** |

**当前规模**：9 个空间 / 38 种控件 / 6 张主页卡 / app.html 8882 行 / 189 项测试

---

## 一、✅ 已完整重构（16 项）

| LX-Pro 界面 | 源码位置 | Rebuild 实现 |
|---|---|---|
| `nav_home` 主页 | `Home/Views/Home/index.tsx:195-300` | 主页球面 **6 卡**（az 0/60/120/180/240/300） |
| `nav_search` 搜索 | `Home/Views/Search/index.tsx` | `search` 空间（3 控件） |
| `nav_love` 我的列表 | `Home/Views/Mylist/index.tsx` | `playlist` 空间（5 控件，40 真实歌单） |
| `nav_stats` 听歌统计 | `Home/Views/Stats/index.tsx` | `stats` 空间（**13 控件**，12 区块对齐） |
| `PlayDetail` 播放页 | `PlayDetail/Vertical/index.tsx` | `now` 空间（9 控件） |
| ├ `MoreBtn` 按钮行 | `PlayDetail/.../MoreBtn/index.tsx:123-127` | `morebtn`（3 按钮） |
| ├ `PlayDetailMenu` 更多菜单 | `PlayDetail/components/PlayDetailMenu.tsx:66-85` | `playmenu`（4 项） |
| ├ `SettingPopup` 播放设置 | `PlayDetail/components/SettingPopup/` | `playsetting`（字号/对齐/开关） |
| ├ 歌词（三态高亮） | `PlayDetail/Vertical/Lyric.tsx:74-100` | `lyric3d`（**四态**，比原版更细腻） |
| `PlayerBar` 迷你播放条 | `components/player/PlayerBar/index.tsx` | 底部 `.mini`（保留） |
| 歌曲项徽章 | `Mylist/MusicList/ListItem.tsx:127-130` | 音源徽章（`songrow` 内） |
| `nav_setting` 设置 | `Home/Views/Setting/`（7319 行） | `settings` 空间（**10 控件 / 7 分区**） |
| `AlbumDetail` 专辑详情 | `AlbumDetail/`（102 行） | `album` 空间（`headcard` + 列表） |
| `ArtistDetail` 歌手详情 | `ArtistDetail/`（1110 行） | `artist` 空间（`headcard` + 列表） |
| `SonglistDetail` 歌单详情 | `SonglistDetail/`（869 行） | `songlist` 空间（`headcard` + 列表） |
| 搜索类型切换 | `Search/SearchTypeSelector.tsx` | `search` 空间 4 类型 tabs |

### 统计页 12 区块对照（全部完成）

| # | LX-Pro 区块 | 源码行号 | Rebuild 控件 |
|---|---|---|---|
| 1 | Hero | `:640` | `stat` |
| 2 | 本月听歌报告 | `:667-691` | `metrics` |
| 3 | 本月最常听 | `:693-719` | `metrics` |
| 4 | 活跃时间分布 | `:721-740` | `chart_bar24` |
| 5 | 活跃时长对比 | `:742-755` | `chart_line` |
| 6 | 听歌画像 | `:756-799` | `chart_radar` |
| 7 | 听歌习惯 | `:801-824` | `metrics` |
| 8 | 长期偏好画像 | `:826-853` | `metrics` |
| 9 | 音乐平台占比 | `:855-869` | `chart_donut` |
| 10 | 播放次数排行 | `:870-893` | `bars` |
| 11 | 累计时长排行 | `:895-919` | `bars` |
| 12 | 歌手排行 / 最近播放 | `:921-966` | `bars` / `list` |

> 另有 `MonthHeatMap` / `YearOverview` → `chart_heat`
> ⚠️ 真实数据仅 11 天，故热力图按**实际天数**排布，不做整年（否则大片空白）

---

## 二、🟡 只有简版（真实缺口）

| LX-Pro 界面 | 规模 | Rebuild | 差距 |
|---|---|---|---|
| Download 下载 | 396 行 | `download` 3 控件 | 简版（仅此项剩余） |

> 其余审计时的简版项（设置/搜索/歌单详情）**已在本轮补齐**，见第三节。

### 设置页的 12 个分区（LX-Pro 实际规模）

| 分区 | 规模 | 内容示例 | 用户要否 |
|---|---|---|---|
| `Basic` | 1904 行 / 24 文件 | 抽屉位置 / 字号 / 隐藏导航栏 / 启动自动播放 | 🟡 部分 |
| `Theme` | 598 行 / 9 文件 | 主题 / 模糊 / 自定义背景 / 动态背景 / 图片透明度 | ✅ |
| `Player` | 486 行 / 13 文件 | 音频卸载 / 音频焦点 / 保存播放时间 / 蓝牙歌词 / 歌词翻译 | ✅ |
| `LyricDesktop` | 667 行 / 12 文件 | 桌面歌词（锁 / 单行 / 行数 / 透明度 / 位置 / 字号） | 🟡 仅歌词部分 |
| `Download` | 396 行 / 10 文件 | 下载音质 / 并发数 / 保存路径 | ✅ |
| `List` | 316 行 / 8 文件 | 列表显示项 / 封面 / 行高 | ✅ |
| `Backup` | 160 行 / 3 文件 | 备份 / 恢复（本地向） | ✅ |
| `Version` | 31 行 | 检查更新 | ✅ |
| `About` | 95 行 | 关于 | ✅ |
| `Other` | 604 行 / 7 文件 | 其他杂项 | ⬜ |
| `Sync` | 657 行 / 3 文件 | 同步（需服务端） | ❌ |
| `Search` | 83 行 / 3 文件 | 搜索设置 | ⬜ |

**用户指定的范围（2026-09-22）**：主题 / 播放 / 歌词 / 下载 / 列表 / 备份（本地向）/ 版本（关于页与检查更新）

---

## 三、✅ 已补齐（审计时标为「未做」）

| LX-Pro 界面 | 规模 | 现在的实现 |
|---|---|---|
| **AlbumDetail 专辑详情** | 102 行 | `album` 空间：`headcard`（唱片环 + 名称 + 统计 + 3 按钮）+ 歌曲列表 |
| **ArtistDetail 歌手详情** | 1110 行 | `artist` 空间：`headcard`（头像轮廓 + 歌曲数/专辑数）+ 歌曲列表 |
| **SonglistDetail 歌单详情** | 869 行 | `songlist` 空间：`headcard`（堆叠卡片 + 首数）+ 该歌单的歌 |
| **Search 类型切换** | 1301 行 | `search` 空间：4 类型 tabs（音乐/歌手/专辑/歌单）+ 本地搜索 |
| **Setting 7 分区** | 7319 行 | `settings` 空间：主题/播放/歌词/下载/列表/备份/版本 |

### 关键设计差异（有意为之）

| 项 | LX-Pro | 本项目 | 原因 |
|---|---|---|---|
| 详情页数据 | `wyApi.getAlbum/getArtist`（平台接口） | **本地聚合**（REAL.albums/artists） | 无后端；备份里有专辑名/歌手 |
| 搜索 | 平台搜索接口 | **本地搜索**（3208 首全量） | 同上 |
| 详情页入口 | 平台页面跳转 | 点歌单/歌手名 → `gotoSpace` | 主页不加卡片（用户要求） |
| 导航 | 平台路由 | **空间导航栈**（`spaceStack`） | 支持逐级返回 |

## 四、❌ 有意不移植（13 项）

> 用户明确表示「很多功能我不需要」，以下均为**第三方平台依赖**或**网盘/账号体系**。

| LX-Pro 导航项 | 依赖 | 原因 |
|---|---|---|
| `nav_songlist` 歌单广场 | 第三方平台 | 平台内容 |
| `nav_top` 排行榜 | 第三方平台 | 平台内容 |
| `nav_daily_rec` 每日推荐 | 平台算法 | 平台推荐 |
| `nav_followed_artists` 关注的歌手 | `wyApi.getAllSublist` | 需登录网易云 |
| `nav_subscribed_albums` 收藏的专辑 | `wyApi.getAllSubAlbumList` | 需登录 |
| `nav_my_playlist` 我的歌单（网易云） | `wyApi.getUserPlaylists(uid,cookie)` | 需登录 |
| `nav_onedrive` OneDrive | `core/oneDrive/` | 网盘 |
| `nav_webdav` WebDAV | `core/webdavMusic/` | 网盘 |
| `nav_play_history` 播放历史 | 本地 | **用户主动删除该卡片** |
| Comment 评论 | 平台接口 | 需联网平台 |
| 播放 MV / VideoPlayer | 平台接口 | 需平台 |
| WebLogin / YouTubeLogin | 平台账号 | 账号体系 |
| DesktopLyric 桌面歌词 | 移动端概念 | 不适用于手机 |
| Oobe 引导 | — | 原型不需要 |
| **横屏 / 沉浸模式** | `PlayDetail/Horizontal/` + `LandscapeImmersion/` | **用户明确不做**（手机竖屏为主场景） |

> ⚠️ **易混淆点**：`nav_love`「我的列表」= **本地自建歌单**（不依赖平台）→ **要**；
> `nav_my_playlist`「我的歌单」= 网易云账号歌单（需登录）→ **不要**。

---

## 五、🔀 空间化改造（设计不同，非遗漏）

| LX-Pro 做法 | Rebuild 做法 | 依据 |
|---|---|---|
| 封面 ⇄ 歌词 **双页切换**（`PagerView`） | **同屏**：歌词左 + 封面右 | `docs/10`「同屏优于分页」；用户确认 |
| 抽屉导航（14 项） | 主页球面 **6 张功能卡** | `docs/10`「环绕比弹层高级」 |
| 顶栏 Header | 索引栏 + 面包屑 | 空间化 |
| 弹窗（菜单 / 设置） | **环绕面**（转视角可见） | `docs/10`「环绕比弹层高级」 |
| 列表 + 详情两级 | **同屏组合**（tabs+grid+songrow） | `docs/10` |

---

## 六、其他差异说明

| 项 | 说明 |
|---|---|
| **数据来源** | Rebuild 用**真实备份**（3208 首 / 40 歌单 / 649 播放事件），LX-Pro 是运行时从平台拉取 |
| **色彩体系** | Rebuild 中性灰黑 `#08090C`/`#7A828C`；LX-Pro 暗色主题 `black`（`rgb(190,190,190)`）——**两套不同体系，未照搬** |
| **字号规范** | LX-Pro 有 `Typography.js` 常量但新代码未普遍遵循；Rebuild 用 `P * 系数` 现算 |
| **音源徽章** | LX-Pro 是「音源+音质+VIP+cover」4 种；Rebuild 只有音源（真实数据无音质/VIP 字段） |
| **歌词高亮** | LX-Pro 两态；Rebuild 四态（0.97/0.44/0.22/0.10）——**更细腻，有意保留** |

---

## 七、建议补齐顺序

| 优先级 | 项 | 状态 |
|---|---|---|
| P1 | 设置页（7 个指定分区） | ✅ **已完成** |
| P2 | 专辑 / 歌手详情（`headcard`） | ✅ **已完成** |
| P3 | 搜索页增强（4 类型） | ✅ **已完成** |
| ~~P4~~ | ~~横屏 / 沉浸模式~~ | ❌ **用户明确不做** |
| — | 下载管理增强 | 🟡 可选（唯一剩余简版项） |

---

## 附：核对方法

本文档的事实来自：

```bash
# LX-Pro 各界面规模
find src/screens -name "*.tsx" | xargs wc -l

# NAV_MENUS 清单
grep -A16 "export const NAV_MENUS" src/config/constant.ts

# Rebuild 现有空间
python3 -c "...统计 PAGES 各空间的 type 列表..."

# Rebuild 控件清单
grep -c "DRAW\." prototype/app.html
```
