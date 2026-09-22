# data/ — 真实数据源

> 琥珀 2026-09-22 通过 `ntfy.sh/hoper` 上传的真实 LX-Pro 备份。
> 界面不再用编造的示例数据，全部基于这里的真实数据。

## 文件

| 文件 | 来源 | 内容 |
|---|---|---|
| `lx_backup.lxmc` | ntfy 附件 | 原始备份（gzip），4285885 字节解压后 |
| `lx_stats.lxmc` | ntfy 附件 | 原始统计（gzip） |
| `lx_backup.json` | 解压 | 歌单 + 歌曲 + 播放历史 + 设置 |
| `lx_stats.json` | 解压 | daily / song / events 统计 |
| `real_data.js` | **生成** | 供 app.html 内联的数据块 |
| `gen_real_data.py` | — | 生成脚本 |

## 数据规模（真实）

```
全部歌曲    3208 首
自建歌单      40 个（合计 1145 首）
我的收藏     243 首
播放历史     185 条
播放事件     649 条（统计用）
统计跨度      11 天
累计时长    35.6 小时
```

## 重新生成

数据更新后（比如又导出了新备份）：

```bash
# 1) 覆盖 lx_backup.json / lx_stats.json（先 gunzip 原文件）
# 2) 重新生成
python3 data/gen_real_data.py > data/real_data.js
# 3) 把 real_data.js 内联进 prototype/app.html（替换 "真实数据" 注释块）
# 4) 跑测试
cd prototype && node test/run.js
```

## ⚠️ 注意

- **`real_data.js` 是自动生成的，勿手改**（改 `gen_real_data.py` 后重跑）
- 原始 `.lxmc` 与 `.json` **含个人信息**（听歌记录），仓库是 **public**：
  当前已提交的是**衍生数据**（歌单名/歌手名/统计数字），
  未提交原始文件——见 `.gitignore`
