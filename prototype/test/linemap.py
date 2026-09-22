#!/usr/bin/env python3
"""一键生成 app.html 的权威行号表（用于更新 docs/11）。
用法：cd prototype && python3 test/linemap.py
"""
import os, sys

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app.html')
src = open(APP, encoding='utf-8').read()
lines = src.split('\n')

MARKS = [
    ('HTML 结构', '<canvas id="scene">'),
    ('HTML 结构', '<!-- 搜索输入面板 -->'),
    ('HTML 结构', '<script src="three.min.js">'),
    ('基础', 'const FONT ='),
    ('字号阶梯', 'const TS = {'),
    ('基础', 'const canvas ='),
    ('基础', 'const camera = new THREE.PerspectiveCamera'),
    ('真实数据', 'const REAL = {};'),
    ('真实数据', 'REAL.overview = {'),
    ('真实数据', 'REAL.topSingers = ['),
    ('真实数据', 'REAL.dailySeries = {'),
    ('数据', 'const FEATURES = ['),
    ('数据', 'const SPOTS = ['),
    ('数据', 'const PAGES = {'),
    ('配色', 'const PALETTES = ['),
    ('液态玻璃', 'const LIQUID = {'),
    ('液态玻璃', 'function applyLiquidGlass'),
    ('液态玻璃', 'function makeLiquidGlassFace'),
    ('液态玻璃·安全网', 'let LIQUID_FAILED'),
    ('绘图工具', 'function roundRect'),
    ('绘图工具', 'function wp('),
    ('控件绘制', 'const DRAW = {'),
    ('控件绘制', '  search(g, W, H'),
    ('控件绘制', '  chips(g, W, H'),
    ('控件绘制', '  list(g, W, H'),
    ('控件绘制', '  tabs(g, W, H'),
    ('控件绘制', '  grid(g, W, H'),
    ('控件绘制', '  songrow(g, W, H'),
    ('控件绘制', '  listnav(g, W, H'),
    ('控件绘制', '  bars(g, W, H'),
    ('控件绘制', '  cover(g,W,H'),
    ('控件绘制', '  lyric3d(g,W,H'),
    ('控件绘制', '  transport(g,W,H'),
    ('控件绘制', '  chart_bar24(g'),
    ('控件绘制', '  chart_radar(g'),
    ('控件绘制', '  chart_donut(g'),
    ('控件绘制', '  metrics(g, W, H'),
    ('控件绘制', '  chart_line(g'),
    ('控件绘制', '  chart_heat(g'),
    ('控件绘制', '  morebtn(g, W, H'),
    ('控件绘制', '  playmenu(g, W, H'),
    ('控件绘制', '  playsetting(g, W, H'),
    ('控件高度', 'function widgetHeight'),
    ('主页卡片', 'const CARD_PPM ='),
    ('主页卡片', 'const CARD = {'),
    ('贴图', 'const HALO_TEX ='),
    ('主页卡片创建', 'const mainGroup ='),
    ('主页卡片创建', 'const R = 5.6'),
    ('死代码·菜单墙', 'const MENUS = ['),
    ('死代码·菜单墙', '// buildMenuWall();'),
    ('最近访问', 'const RECENT_MAX'),
    ('最近访问', 'function touchRecent'),
    ('最近访问', 'function reorderGrid'),
    ('长列表', 'const LIST_BUF'),
    ('长列表', 'function listNavTarget'),
    ('长列表', 'function listRows'),
    ('长列表', 'function syncListWindow'),
    ('长列表', 'function rebuildListWindow'),
    ('长列表', 'function scrollList('),
    ('长列表', 'function scrollListTo'),
    ('长列表', 'function scrollListTop'),
    ('长列表', 'function tickListInertia'),
    ('长列表', 'function tickListSnap'),
    ('长列表', 'function navSeek'),
    ('子空间系统', 'const pageByKey = {}'),
    ('子空间系统', 'function redrawWidget'),
    ('子空间系统', 'function makeWidgetMesh'),
    ('子空间系统', 'function buildPage'),
    ('子空间系统', 'function activatePage'),
    ('播放器数据', 'const TRACKS = ['),
    ('死代码·黑胶', 'const coverGroup ='),
    ('死代码·黑胶', 'function layoutVinyl'),
    ('播放状态', 'const NP = {'),
    ('播放状态', 'function fmt('),
    ('死代码·DOM播放器', 'function loadTrack'),
    ('死代码·DOM播放器', 'function openPlayer'),
    ('共用', 'function setPlaying'),
    ('共用', 'function syncMini'),
    ('空间播放器', 'function nowWidgets'),
    ('空间播放器', 'function switchTrack'),
    ('空间播放器', 'function nowTick'),
    ('星空', 'const STAR_COUNT'),
    ('泛光后处理', 'const BLOOM = (function()'),
    ('星空', 'const MOTE_N'),
    ('状态与相机', "let mode = 'main'"),
    ('状态与相机', 'const CAM = {'),
    ('状态与相机', 'function camCfg'),
    ('射线', 'function raycastWidget'),
    ('射线', 'function hitRegion'),
    ('射线', 'function seekTo'),
    ('交互', 'function onDown'),
    ('交互', 'function onMove'),
    ('交互', 'function onUp'),
    ('交互', 'function pick'),
    ('交互', 'const MOUSE_AFTER_TOUCH'),
    ('控件行为', 'function updateSongList'),
    ('控件行为', 'function syncPlaylistSet'),
    ('控件行为', 'function handleRegion'),
    ('搜索面板', 'function openSheet'),
    ('搜索面板', 'function submitSearch'),
    ('转场', 'function wipe('),
    ('转场', 'function playEnter'),
    ('转场', 'function enterSection'),
    ('转场', 'function exitSection'),
    ('定位', 'function lookAtCard'),
    ('定位', 'function rebuildIndex'),
    ('定位', 'function updateIndicators'),
    ('动画', 'function animate()'),
    ('启动', 'rebuildIndex(mainPanels);'),
    ('UI', 'function toast'),
]

print(f'总行数: {len(lines)}')
print()
rows = []
for cat, pat in MARKS:
    for i, l in enumerate(lines):
        if pat in l:
            rows.append((cat, i+1, l.strip()[:50]))
            break
    else:
        rows.append((cat, None, '?? 未找到: ' + pat))

for cat, n, t in rows:
    loc = f'L{n}' if n else '??'
    print(f'{cat:16s} {loc:>7s}  {t}')

if '--md' in sys.argv:
    print('\n\n--- Markdown 表 ---')
    for cat, n, t in rows:
        if n: print(f'| {cat} | L{n} | {t} |')
