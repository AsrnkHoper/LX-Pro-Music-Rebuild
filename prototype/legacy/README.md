# legacy/ — 已废弃的早期原型

> 归档日期：2026-09-22
> **这些文件不再维护，仅作历史参考。** 唯一在维护的原型是上级目录的 `../app.html`。

## 文件清单

| 文件 | 当时的定位 | 为什么废弃 |
|---|---|---|
| `index.html` | 深空风主页（纯 DOM/CSS） | 被球面卡片方案取代 |
| `home.html` | 扁平版主页（2×2 功能卡） | `docs/04` 方案 1 的落地，已过时 |
| `home_space.html` | 主页空间感试验 | 试验品，被 `home_sphere` 取代 |
| `home_sphere.html` | 球面空间主页 | 已并入 `app.html` 的主页 |
| `space.html` | 深空漂移（封面面板向前飞） | `docs/02` 方案 A 演示；`docs/03` 参数手册对应此文件 |
| `space2.html` | 深空漂移变体（纯 CSS 3D，不用 WebGL） | 同上，CSS 假 3D 路线已否决 |
| `space_pro.html` | 深空漂移 Pro | 同上 |

## ⚠️ 依赖说明

`home_space.html` / `home_sphere.html` / `space.html` / `space_pro.html` 这 4 个文件
引用的是 **`../three.min.js`**（即上级目录那份），因为归档时改过路径。

- 打开方式：直接用浏览器打开本目录下的 html 即可，`../three.min.js` 会正常加载
- **不要**把这 4 个文件单独拷走，否则找不到 `three.min.js`
- `index.html` / `home.html` / `space2.html` 无外部依赖，可独立打开

## 相关文档

- `docs/02_真3D空间感技术调研.md` — 对应 `space*.html` 的技术选型结论（CSS 假 3D vs WebGL 真 3D）
- `docs/03_参数调节手册.md` — 调参对象是 `space.html`（不是 `app.html`），对照阅读
- `docs/04_主页导航结构.md` — 对应 `home.html`
