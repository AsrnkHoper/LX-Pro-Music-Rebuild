# LX Pro · 空间原型

> **把「音乐 App 的界面」重做成一个可以转动的三维空间。**
> 没有 Tab、没有页面栈、没有弹窗——转动视角就是浏览。

在线预览：**https://lx-pro.hoper.eu.org**

---

## 这是什么

一个 **Three.js（WebGL）真 3D 原型**，用来验证一套非传统的音乐播放器交互：

| 传统做法 | 本原型 |
|---|---|
| 底部 Tab 切换页面 | **7 张功能卡散布在球面上**，转动视角浏览 |
| 点进列表 → 点进详情（两级） | **列表与详情同屏**，转视角看右边 |
| 弹窗/抽屉挡住内容 | **环绕面**：信息在四周，转过去就在 |
| 上滑弹出播放页 | **同屏**：歌词左、封面右、控制下 |

核心主张来自 `docs/10_空间重组设计思想.md`：

> 一切皆在空间里 · 转动视角 = 获取信息 · 裸元素优先 · 环绕比弹层高级

**只做 UI 与交互，不接真实功能。**

---

## 快速开始

```bash
# 本地打开（需要一个本地服务器，因为要加载 three.min.js）
cd prototype && python3 -m http.server 8080
# 然后浏览器打开 http://localhost:8080/app.html
```

> ⚠️ 必须用**支持 WebGL 的浏览器**。某些 App 内置 WebView 会拦截脚本导致卡在加载。
> 手机端请用 Chrome / Firefox / Safari 直接打开。

**验收建议**：桌面浏览器按 `Ctrl+Shift+M` 开响应式设计模式，选手机尺寸（如 390×844），
这样看到的才是设计时的观感——本原型的世界坐标是按手机竖屏调的。

---

## 目录结构

```
.
├── index.html              Vercel 入口（手机自动跳转，桌面显示引导页）
├── prototype/
│   ├── app.html            ★ 唯一在维护的原型（Three.js，单文件）
│   ├── three.min.js        Three.js r160（本地，必须与 app.html 同目录）
│   └── legacy/             早期迭代归档（7 个 HTML，不再维护，见其 README）
├── docs/                   01~11 策划与规范文档
└── backups/                原型快照（改动前的存档）
```

---

## 文档索引

| 文档 | 内容 | 状态 |
|---|---|---|
| `docs/10_空间重组设计思想.md` | ★★★ **设计哲学，最高优先级** | 有效 |
| `docs/11_项目交接文档.md` | ★★ **新会话从这里开始**（架构地图/参数/死代码/踩坑） | 有效 |
| `docs/08_LX-Pro界面调研报告.md` | 参考项目（RN 旧版）的全部界面与信息结构 | 有效 |
| `docs/09_空间化建构方案.md` | 页面映射与分期计划 | 部分有效（菜单弧已废弃） |
| `docs/07_空间播放器规范.md` | 播放页布局 | 有效 |
| `docs/05_页面结构与转场规范.md` | 转场机制 | 有效 |
| `docs/06_沉浸式歌曲页规范.md` | DOM 播放器方案 | ⛔ **已废弃** |
| `docs/01~04` | 早期扁平版设计 | 参考（已过时） |

---

## 已完成 / 待做

**已完成**
- 主页球面（7 张功能卡）+ 卡片冲向镜头的转场
- 20 种空间控件（`DRAW` 对象）
- 空间播放器（歌词左 · 封面右 · 控制下，同屏）
- 我的歌单：分类 + 歌单网格 + 歌曲列表 **环绕同屏**
- **长列表虚拟滚动**：窗口化贴图，内存与曲目数无关（523 首 ≈ 2.9 MB）
- **导航手段**：搜索直达 / 导航条快速定位 / 最近访问置顶 / 松手对齐

**待做**
- 圆柱曲面列表（当前是平面面板 + 虚拟滚动）
- 播放历史 / 下载 / 搜索的列表化改造
- 专辑 / 歌手详情（需 `headcard` 控件）
- 播放页扩展（操作环 / 播放设置）
- 液态玻璃材质（与球面骨架融合）

---

## 技术要点

- **单文件原型**：`prototype/app.html`（约 3600 行，HTML + CSS + JS 内联）
- **无构建步骤**：改完刷新即可，`three.min.js` 本地加载
- **窗口化虚拟列表**：只把「可见窗口 + 缓冲」画进 `CanvasTexture`，
  滚动改 `tex.offset.y`（GPU 侧采样，零重绘），滚出缓冲才重画
- **屏幕比例定位**：子空间控件用 `sf/sv/fw/fh`（屏幕比例），适配不同长宽比
- **射线拾取**：`pointer → NDC → raycaster → hit.uv → regions → 动作`

> ⚠️ **已知限制**：主页球面的世界坐标（半径 `R=6.5` 等）是固定值，
> 当初按手机竖屏调校，在桌面宽屏上观感会偏散（相机 FOV 是垂直的，
> 横向视野随宽高比放大）。故验收请用响应式模式或真机。

---

## 部署（Vercel + 自定义域名）

```
GitHub: AsrnkHoper/LX-Pro-Music-Rebuild
   ↓ 自动部署（Vercel 监听 main 分支）
Vercel: lx-pro-music-rebuild.vercel.app
   ↓ Cloudflare 反向代理（橙云）
线上: https://lx-pro.hoper.eu.org
```

**为什么绕 Cloudflare**：`vercel.app` 在部分网络（含校园网 SNI 白名单）**不可直达**，
直连会超时。走 Cloudflare 边缘可正常访问，且带缓存。

**改动流程**：`git push origin main` → Vercel 自动重新部署 → 域名同步生效（约 1 分钟）。

**配置位置**（万一要改）：
| 项 | 在哪 |
|---|---|
| Vercel 项目 | vercel.com → LX-Pro-Music-Rebuild |
| DNS 记录 | Cloudflare → `hoper.eu.org` → DNS → `lx-pro` 的 CNAME |
| Host 头改写 | Cloudflare → Rules → Transform Rules（反代必需，否则 Vercel 返回 404） |
| SSL 模式 | Cloudflare → SSL/TLS → `Full` |

> 详细说明见 `docs/12_部署与域名.md`。

---

## 相关项目

| 项目 | 说明 |
|---|---|
| [LX-Pro-Music](https://github.com/AsrnkHoper/LX-Pro-Music) | 参考项目（React Native 旧版），本原型的界面调研来源 |
| `LX_Pro_Rebuild` | 原生主项目（Kotlin + Jetpack Compose + Media3），本原型验证的交互最终要用原生实现 |

> 本仓库是 **UI 原型工作区**，与原生主项目的策划工作区是两个独立目录。
