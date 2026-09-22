# backups/ — 原型快照

> 每次**大改动前**的存档，用于对比/回退。**不是可独立运行的文件。**

| 文件 | 说明 |
|---|---|
| `app_v1_冷蓝调_20260922.html` | P1（我的歌单）开工前 |
| `app_v2_改圆柱列表前_20260922.html` | 长列表虚拟滚动改造前 |

## ⚠️ 打开方式

这些快照里的 `<script src="three.min.js">` 是**相对路径**，而 `three.min.js` 在
`../prototype/` 下 —— 所以**直接打开会加载不到 Three.js**。

要看某个快照：

```bash
# 复制到 prototype/ 下（与 three.min.js 同目录）再看
cp backups/app_v2_改圆柱列表前_20260922.html prototype/_snapshot.html
# 然后浏览器打开 prototype/_snapshot.html，看完删掉
```

或者对比代码差异（更常用）：

```bash
git diff --no-index backups/app_v2_改圆柱列表前_20260922.html prototype/app.html
```

## 当前版本

`../prototype/app.html` —— 唯一在维护的原型。
