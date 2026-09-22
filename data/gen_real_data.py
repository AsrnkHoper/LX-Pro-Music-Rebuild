#!/usr/bin/env python3
"""把 LX-Pro 真实备份（lxmc）转成 app.html 可用的数据片段。

用法：python3 data/gen_real_data.py > data/real_data.js
数据来源：data/lx_backup.json（歌单/歌曲）+ data/lx_stats.json（统计）
"""
import json, os, math
from collections import Counter, defaultdict
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_NAMES = {'wy':'网易云','bi':'Bilibili','local':'本地文件','tx':'QQ音乐',
             'kg':'酷狗','mg':'咪咕','kw':'酷我','joox':'JOOX'}

def load():
    st = json.load(open(os.path.join(HERE,'lx_stats.json'), encoding='utf-8'))
    bk = json.load(open(os.path.join(HERE,'lx_backup.json'), encoding='utf-8'))['data']
    return st, bk

def js(v):
    """Python 值 → JS 字面量（紧凑、中文不转义）"""
    return json.dumps(v, ensure_ascii=False, separators=(',',':'))

def main():
    st, bk = load()
    ev = st['events']
    daily = st['daily']
    out = []
    A = out.append

    A('/* ============================================================')
    A('   真实数据（由 data/gen_real_data.py 自动生成，勿手改）')
    A('   来源：LX-Pro 真实备份 lx_backup.lxmc + lx_stats.lxmc')
    A(f'   导出时间：{datetime.now():%Y-%m-%d %H:%M}')
    A(f'   规模：{len(bk["lists"]["defaultList"])} 首全部歌曲 / '
      f'{len(bk["lists"]["userList"])} 个自建歌单 / {len(ev)} 条播放事件')
    A('============================================================ */')
    A('const REAL = {};')
    A('')

    # ── 概览 ──
    tot_d = sum(x['duration'] for x in daily)
    tot_p = sum(x['plays'] for x in daily)
    act   = len([x for x in daily if x['duration'] > 0])
    days  = len(daily)
    A('/* 概览 */')
    A('REAL.overview = {')
    A(f'  hours: {tot_d/3600:.1f}, plays: {tot_p}, activeDays: {act},')
    A(f'  avgHours: {tot_d/3600/max(1,act):.1f}, spanDays: {days},')
    A(f'  songs: {len(bk["lists"]["defaultList"])}, playlists: {len(bk["lists"]["userList"])},')
    A(f'  loveCount: {len(bk["lists"]["loveList"])}, historyCount: {len(bk["playHistory"])} }};')
    A('')

    # ── 24 小时分布 ──
    hours = [0]*24
    for e in ev:
        ts = e.get('playedAt')
        if ts: hours[datetime.fromtimestamp(ts/1000).hour] += 1
    mx = max(hours) or 1
    top_h = hours.index(max(hours))
    A('/* 24 小时活跃分布（次数，峰值小时用 top 标记）*/')
    A(f'REAL.hourly = {{ bars: {js([round(h/mx,3) for h in hours])}, '
      f'counts: {js(hours)}, top: {top_h} }};')
    A('')

    # ── 每日时长（折线图）──
    A('/* 每日时长（小时）与次数 —— 折线对比图用 */')
    A('REAL.daily = [')
    for x in daily:
        A(f'  {{ date: {js(x["date"])}, hours: {x["duration"]/3600:.1f}, plays: {x["plays"]} }},')
    A('];')
    A('')

    # ── 六维画像 ──
    n = len(ev)
    songs = set(e['musicInfo']['id'] for e in ev)
    late  = sum(1 for e in ev
                if datetime.fromtimestamp(e['playedAt']/1000).hour in (0,1,2,3,4,5))
    comp  = [min(1, (e.get('playTime') or 0)/max(1, e.get('maxTime') or 1))
             for e in ev if e.get('maxTime')]
    comp_avg = sum(comp)/max(1, len(comp))
    sp = Counter(e['musicInfo']['id'] for e in ev)
    top_plays = max(sp.values()) if sp else 0
    A('/* 六维听歌画像（本地计算，维度对齐 LX-Pro Stats/index.tsx:71-76）*/')
    A('REAL.radar = [')
    for label, v in [
        ('多样性', min(1, len(songs)/max(1,n))),
        ('深夜',   min(1, late/max(1,n))),
        ('循环',   min(1, top_plays/max(1,n))),
        ('完听',   comp_avg),
        ('活跃',   min(1, act/max(1,days))),
        ('探索',   1.0),
    ]:
        A(f'  {{ label: {js(label)}, value: {v:.2f} }},')
    A('];')
    A('')

    # ── 歌手 / 歌曲排行 ──
    sc = Counter(); sd = defaultdict(float)
    for e in ev:
        s = (e['musicInfo'].get('singer') or '未知').strip()
        sc[s] += 1; sd[s] += e.get('playTime') or 0
    A('/* 歌手排行（按次数）*/')
    A('REAL.topSingers = [')
    for s, c in sc.most_common(20):
        A(f'  {{ t: {js(s)}, v: {c/max(1,sc.most_common(1)[0][1]):.2f}, s: {js(f"{c} 次")} }},')
    A('];')
    A('')
    songc = Counter(); songn = {}; songa = {}
    for e in ev:
        i = e['musicInfo']['id']
        songc[i] += 1
        songn[i] = e['musicInfo']['name']
        songa[i] = e['musicInfo'].get('singer','')
    A('/* 歌曲排行（按次数）*/')
    A('REAL.topSongs = [')
    top1 = songc.most_common(1)[0][1] if songc else 1
    for i, c in songc.most_common(20):
        A(f'  {{ t: {js(songn[i])}, v: {c/top1:.2f}, s: {js(f"{c} 次")} }},')
    A('];')
    A('')

    # ── 音源占比 ──
    src = Counter(e['musicInfo'].get('source','?') for e in ev)
    A('/* 音源占比（环形图）*/')
    A('REAL.sources = [')
    for s, c in src.most_common(5):
        A(f'  {{ label: {js(SRC_NAMES.get(s,s))}, value: {c} }},')
    A('];')
    A('')

    # ── 累计时长排行（LX-Pro Stats/index.tsx:895-919）──
    sd2 = defaultdict(float); sn2 = {}
    for e in ev:
        i = e['musicInfo']['id']
        sd2[i] += e.get('playTime', 0) or 0
        sn2[i] = e['musicInfo']['name']
    A('/* 累计时长排行（按时长，非次数）*/')
    A('REAL.topByDuration = [')
    top_d = sorted(sd2.items(), key=lambda x: -x[1])[:12]
    mx_d = top_d[0][1] if top_d else 1
    for i, v in top_d:
        mins = v/60
        lab = f'{mins:.0f} 分钟' if mins < 60 else f'{mins/60:.1f} 小时'
        A(f'  {{ t: {js(sn2[i])}, v: {v/mx_d:.2f}, s: {js(lab)} }},')
    A('];')
    A('')

    # ── 每日时长（折线图，按真实天数）──
    A('/* 每日时长序列（折线图）—— 只有实际天数，不做整年 */')
    A('REAL.dailySeries = {')
    A(f'  labels: {js([x["date"][5:] for x in daily])},')
    A(f'  values: {js([round(x["duration"]/3600, 2) for x in daily])},')
    A(f'  plays:  {js([x["plays"] for x in daily])} }};')
    A('')

    # ── 歌单（40 个自建，按歌曲数排序）──
    ul = sorted(bk['lists']['userList'], key=lambda p: -len(p['list']))
    A('/* 自建歌单（按歌曲数降序）*/')
    A('REAL.playlists = [')
    for p in ul:
        A(f'  {{ t: {js(p["name"])}, n: {len(p["list"])} }},')
    A('];')
    A('')

    # ── 全部歌曲（取前 600 首，避免文件过大；按歌手聚合更有代表性）──
    allsongs = bk['lists']['defaultList']
    A(f'/* 全部歌曲样本（共 {len(allsongs)} 首，取前 600 首）*/')
    A('REAL.allSongs = [')
    for s in allsongs[:600]:
        A(f'  {{ t: {js(s["name"])}, a: {js(s.get("singer",""))}, '
          f'd: {js(s.get("interval",""))} }},')
    A('];')
    A('')

    # ── 最近播放（播放历史前 40 条）──
    A('/* 最近播放（播放历史前 40 条）*/')
    A('REAL.recent = [')
    for h in bk['playHistory'][:40]:
        mi = h['musicInfo']
        A(f'  {{ t: {js(mi["name"])}, a: {js(mi.get("singer",""))}, '
          f'd: {js(mi.get("interval",""))} }},')
    A('];')

    print('\n'.join(out))

if __name__ == '__main__':
    main()
