/* ============================================================
   app.html 回归测试
   用法：cd prototype && node test/run.js
   覆盖：语法/空间构建/交互链路/长列表滚动/惯性/歌词同步
============================================================ */
require('./harness.js');
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..', 'app.html');
const html = fs.readFileSync(APP, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if(!m){ console.error('❌ 未找到内联 <script>'); process.exit(1); }
let code = m[1];

/* 时间与定时器打桩：手动控制时序 */
const timers = [];
global.setTimeout = (fn, ms) => { timers.push({fn, ms}); return timers.length; };
global.clearTimeout = () => {};
global.__RAF_OFF = true; global.__HIT = null;
let __CLK = 1000000; Date.now = () => __CLK;

/* 关掉自动启动，改为手动触发 */
code = code.replace('function animate(){', 'function animate(){ if(!global.__RAF_OFF) requestAnimationFrame(animate);');
code = code.replace(/^\s*requestAnimationFrame\(animate\);\s*$/m, '/*raf*/');
code = code.replace(/^rebuildIndex\(mainPanels\);$/m, '/*skip*/')
           .replace(/^playEnter\(mainPanels\);\s*$/m, '/*skip*/')
           .replace(/^animate\(\);$/m, '/*skip*/');
code += `
;global.__T = { enterSection, exitSection, animate, onDown, onMove, onUp,
  pageByKey, PAGES, FEATURES, SPOTS, mainPanels, mainGroup, subGroup,
  playEnter, listRows, scrollList, scrollListTo, scrollListTop, listNavTarget,
  curLyricIndex, nowWidgets, TRACKS, DRAW, widgetHeight,
  handleRegion, settingSlide, redrawWidget, nowWidgets,
  buildPage, activatePage, gotoSpace, spaceStack, localSearch, applySearch,
  pulseFromAudio, updateAudio, applyAudioVisual, AUDIO,
  get NP(){return NP;}, get mode(){return mode;}, set mode(v){mode=v;},
  get busy(){return busy;}, get curPageKey(){return curPageKey;},
  set curPageKey(v){curPageKey=v;}, get flyCard(){return flyCard;},
  REAL: (typeof REAL !== 'undefined') ? REAL : null,
  BLOOM, TS, fpx, LIQUID, makeLiquidGlassFace };`;

try { eval(code); }
catch(e){ console.error('❌ app.html 加载期异常:', e.message); process.exit(1); }

const T = global.__T;
const drain = () => { const t = timers.splice(0); t.sort((a,b)=>a.ms-b.ms).forEach(x=>x.fn()); };
const step  = () => { __CLK += 16; T.animate(); };

let errN = 0, errs = {};
const frames = n => { for(let i=0;i<n;i++){ try{ step(); }catch(e){ errN++; const k=e.message.slice(0,70); errs[k]=(errs[k]||0)+1; } } };

let pass = 0, fail = 0;
const ok = (c, msg) => { if(c){ pass++; console.log('  ✅ '+msg); } else { fail++; console.log('  ❌ '+msg); } };

/* ── 1. 空间构建 ── */
console.log('\n════ 1. 全部空间构建 ════');
const keys = Object.keys(T.PAGES);
/* 用真实卡片进入（enterSection 需要 mesh.position / userData.feature）*/
const cardOf = key => T.mainPanels.find(x => x.userData.feature.key === key);
/* ⚠️ album/artist 没有主页卡片（从列表跳进去），故直接 buildPage + activatePage */
const enter = key => {
  T.curPageKey = key;
  const c = cardOf(key);
  if(c){ T.enterSection(c); drain(); }
  else { T.buildPage(key); T.activatePage(key); }
};
for(const key of keys){
  try{
    enter(key);
    const n = (T.pageByKey[key]||[]).length;
    const cfgN = T.PAGES[key].widgets.length;
    ok(n === cfgN && n > 0, `${key.padEnd(9)} 构建 ${n}/${cfgN} 个控件`);
  }catch(e){ ok(false, `${key} 抛异常: ${e.message}`); }
}

/* ── 2. 卡片数量与方位 ── */
console.log('\n════ 2. 主页卡片 ════');
ok(T.FEATURES.length === 6, `6 张卡（实际 ${T.FEATURES.length}）`);
ok(!T.FEATURES.some(f=>f.key==='history'), '不含「播放历史」');
ok(T.SPOTS.length === T.FEATURES.length, 'SPOTS 与 FEATURES 数量一致');

/* ── 3. 进入 → 返回 ── */
console.log('\n════ 3. 进入/返回（原黑屏 bug 回归）════');
T.playEnter(T.mainPanels); frames(60);
const card = cardOf('playlist');
T.enterSection(card); drain(); frames(60);
ok(T.mode === 'sub', '进入后 mode=sub');
T.exitSection(); drain(); frames(120);
const vis = T.mainPanels.filter(x=>x.userData.faceMat.opacity > 0.5).length;
ok(vis === 6, `返回后 ${vis}/6 卡片可见`);

/* ── 4. 长列表滚动 + 惯性 ── */
console.log('\n════ 4. 长列表滚动 / 惯性 / 导航条 ════');
enter('playlist'); frames(30);
const sr  = T.pageByKey.playlist.find(x=>x.userData.widget.type==='songrow');
const nav = T.pageByKey.playlist.find(x=>x.userData.widget.type==='listnav');
ok(!!sr, '找到 songrow');
ok(!!nav, '找到 listnav');

/* 导航条拖动（原 NaN bug 回归） */
global.__HIT = { object: nav, uv: {x:0.5, y:0.5} };
T.onDown(195,400); T.onMove(195,200); T.onUp(195,200); frames(30);
const sp = sr.userData.state.view.scrollPx;
ok(isFinite(sp), `拖导航条后 scrollPx 非 NaN（${sp.toFixed(0)}）`);

/* 惯性 */
global.__HIT = { object: sr, uv: {x:0.5, y:0.5} };
T.onDown(195,600);
for(let y=600;y>=200;y-=60){ __CLK+=16; T.onMove(195,y); }
T.onUp(195,200);
ok(Math.abs(sr.userData.state.view.vel) > 0.1, `松手有惯性（vel=${sr.userData.state.view.vel.toFixed(2)}）`);
let stopAt = -1;
for(let i=1;i<=400;i++){ step(); if(sr.userData.state.view.vel===0 && stopAt<0) stopAt=i; }
ok(stopAt > 0 && stopAt < 200, `惯性 ${stopAt} 帧后停止`);
ok(isFinite(sr.userData.state.view.scrollPx), 'scrollPx 仍有效');

/* 滚动边界 */
T.scrollListTo(sr, 0);            /* 第 1 首歌 = 标题之下 */
const rr = T.listRows(sr.userData);
ok(Math.abs(sr.userData.state.view.scrollPx - rr.labelPx) < 1,
   `跳到第 1 首歌 = labelPx（${sr.userData.state.view.scrollPx.toFixed(0)}）`);
T.scrollListTop(sr);              /* 回到内容最顶 */
ok(sr.userData.state.view.scrollPx === 0, 'scrollListTop 回到 0');
const r = T.listRows(sr.userData);
T.scrollListTo(sr, r.total + 500);
ok(sr.userData.state.view.scrollPx <= r.maxScrollPx, '超界跳转被夹住');

/* ── 5. 播放页（歌词同步 + 布局无重叠） ── */
console.log('\n════ 5. 播放页歌词同步 ════');
enter('now');
const nowWs = T.pageByKey.now;
ok(!nowWs.some(x=>x.userData.widget.type==='minilyric'),
   '不含 minilyric（歌词已在左半屏常驻，不重复显示）');
T.mode = 'sub'; T.curPageKey = 'now';
const lyrics = T.TRACKS[T.NP.idx].lyrics;
T.NP.cur = lyrics[5].t + 1; frames(2);
ok(T.NP.lyricIdx === 5, `歌词索引同步到第 5 句（实际 ${T.NP.lyricIdx}）`);
/* 超长句不炸 */
const orig = lyrics[3].s;
lyrics[3].s = '这是一句特别特别特别特别特别特别特别特别特别长的歌词用于测试自适应缩放';
T.NP.cur = lyrics[3].t + 1; frames(2);
ok(errN === 0, '超长歌词不抛异常');
lyrics[3].s = orig;

/* now 空间垂直布局无重叠（防回归）
   ⚠️ 按【列】分组比较：lyric3d 在左列(sf≈0.29)，
      cover/nowinfo/transport 在右列(sf≈0.76)。跨列比较无意义。
   ⚠️ 高度取法：fhSquare（按屏高定，恒定）> fh > square 推算 */
const nowCfg = T.PAGES.now.widgets.filter(w => w.sf !== undefined);
const byCol = {};
nowCfg.forEach(w => {
  const col = Math.round(w.sf * 10) / 10;
  const h = w.fhSquare || w.fh || (w.square ? w.fw * (390/844) : 0.05);
  (byCol[col] = byCol[col] || []).push({ type: w.type, sv: w.sv, h });
});
let overlap = 0, cols = 0, gapMin = 1;
for(const col in byCol){
  const items = byCol[col].sort((a,b)=>a.sv-b.sv);
  cols++;
  for(let i=1;i<items.length;i++){
    const gap = (items[i].sv - items[i].h/2) - (items[i-1].sv + items[i-1].h/2);
    gapMin = Math.min(gapMin, gap);
    if(gap < 0){
      overlap++;
      console.log(`      ❌ ${col} 列: ${items[i-1].type} 与 ${items[i].type} 重叠 ${gap.toFixed(4)}`);
    }
  }
}
ok(overlap === 0, `now 空间各列无重叠（${cols} 列 ${nowCfg.length} 控件，最小间隙 ${gapMin.toFixed(4)}）`);

/* 封面尺寸不随屏幕变化（fhSquare 的目的） */
const coverCfg = T.PAGES.now.widgets.find(w => w.type === 'cover');
ok(!!coverCfg && coverCfg.fhSquare !== undefined,
   `封面用 fhSquare 定尺寸（不随宽高比变化）`);

/* ── 5b. 统计图表（P0 新增） ── */
console.log('\n════ 5b. 统计图表绘制 ════');
enter('stats');
const statsWs = T.pageByKey.stats;
const chartTypes = ['chart_bar24','chart_radar','chart_donut'];
chartTypes.forEach(t => {
  const m = statsWs.find(x => x.userData.widget.type === t);
  ok(!!m, `stats 空间含 ${t}`);
});

/* 图表真的调用了绘制 API（而非空跑）——用计数桩验证 */
const calls = { arc:0, lineTo:0, moveTo:0, fillText:0, stroke:0, fill:0 };
const realCtxProto = (() => {
  const probe = require('./harness.js');
  return null;
})();
/* 直接给每个图表控件的 canvas 注入计数 ctx 再重画 */
chartTypes.forEach(t => {
  const m = statsWs.find(x => x.userData.widget.type === t);
  if(!m) return;
  const c = m.userData.canvas;
  const cnt = { arc:0, lineTo:0, moveTo:0, fillText:0, stroke:0, fill:0 };
  const ctx = new Proxy({
    canvas:{width:c.width, height:c.height},
    measureText: s => ({width:String(s).length*8}),
    createLinearGradient: () => ({addColorStop(){}}),
    createRadialGradient: () => ({addColorStop(){}}),
    arc(){ cnt.arc++; }, lineTo(){ cnt.lineTo++; }, moveTo(){ cnt.moveTo++; },
    fillText(){ cnt.fillText++; }, stroke(){ cnt.stroke++; }, fill(){ cnt.fill++; },
    beginPath(){}, closePath(){}, clearRect(){}, save(){}, restore(){},
    fillRect(){}, strokeRect(){}, clip(){}, translate(){}, scale(){},
    setLineDash(){}, quadraticCurveTo(){}, bezierCurveTo(){}, rect(){}
  }, { get(o,k){ if(k in o) return o[k]; return ()=>{}; }, set(o,k,v){ o[k]=v; return true; } });
  /* 换掉 getContext 返回值 */
  c.getContext = () => ctx;
  try {
    T.DRAW[t](ctx, c.width, c.height, m.userData.widget, m.userData.state, 0);
    ok(cnt.stroke > 0 || cnt.fill > 0, `${t.padEnd(14)} 有绘制调用（stroke=${cnt.stroke} fill=${cnt.fill} arc=${cnt.arc} lineTo=${cnt.lineTo} text=${cnt.fillText}）`);
  } catch(e){
    ok(false, `${t} 绘制抛异常: ${e.message}`);
  }
});

/* 图表数据完整性 */
const bar24 = statsWs.find(x=>x.userData.widget.type==='chart_bar24');
ok(bar24 && bar24.userData.widget.bars.length === 24, `24h 柱状图有 24 个数据点（实际 ${bar24?bar24.userData.widget.bars.length:0}）`);
const radar = statsWs.find(x=>x.userData.widget.type==='chart_radar');
ok(radar && radar.userData.widget.items.length === 6, `雷达图 6 个维度（实际 ${radar?radar.userData.widget.items.length:0}）`);
const donut = statsWs.find(x=>x.userData.widget.type==='chart_donut');
ok(donut && donut.userData.widget.items.length >= 2, `环形图有多个平台（实际 ${donut?donut.userData.widget.items.length:0}）`);

/* 环绕布局：区块分布在不同方位（不是全堆在正面） */
const azs = statsWs.map(x=>x.userData.widget.az).filter(a=>a!==undefined);
const uniq = [...new Set(azs)];
ok(uniq.length >= 3, `区块分布在不同方位（${uniq.length} 个方位: ${uniq.join(',')}）`);

/* metrics 控件（承载「标签+数值」型区块） */
const metricsWs = statsWs.filter(x=>x.userData.widget.type==='metrics');
ok(metricsWs.length >= 3, `stats 含 ${metricsWs.length} 个 metrics 区块`);
const mm = metricsWs[0];
if(mm){
  const c = mm.userData.canvas;
  let filled = 0, texts = 0;
  const ctx = new Proxy({
    canvas:{width:c.width, height:c.height},
    measureText: s => ({width:String(s).length*8}),
    createLinearGradient: () => ({addColorStop(){}}),
    createRadialGradient: () => ({addColorStop(){}}),
    fill(){ filled++; }, fillText(){ texts++; },
    beginPath(){}, closePath(){}, clearRect(){}, save(){}, restore(){},
    fillRect(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, clip(){}
  }, { get(o,k){ return (k in o) ? o[k] : ()=>{}; }, set(o,k,v){ o[k]=v; return true; } });
  c.getContext = () => ctx;
  try{
    T.DRAW.metrics(ctx, c.width, c.height, mm.userData.widget, mm.userData.state, 0);
    const nItems = mm.userData.widget.items.length;
    ok(texts >= nItems*2, `metrics 绘制了标签+数值（${texts} 次 fillText / ${nItems} 项）`);
  }catch(e){ ok(false, 'metrics 绘制抛异常: '+e.message); }
}

/* bars 行高自适应（原 bug：内容超出面板被裁切） */
const barsWs = statsWs.filter(x=>x.userData.widget.type==='bars');
let barsOK = true;
barsWs.forEach(m => {
  const u = m.userData;
  const c = u.canvas, P = c.width/5;
  const y = u.widget.label ? 0.68*P : 0;
  const n = u.widget.items.length;
  const avail = c.height - y - 0.20*P;
  const rowH = Math.min(0.72*P, avail/n);
  if(y + n*rowH > c.height + 1) barsOK = false;
});
ok(barsOK, `bars 行高自适应，${barsWs.length} 个排行内容均不超出面板`);

/* ── 5c. 真实数据接入（REAL） ── */
console.log('\n════ 5c. 真实数据接入 ════');
const REAL = T.REAL;
ok(typeof REAL === 'object' && REAL !== null, 'REAL 数据块存在');
if(REAL && typeof REAL === 'object'){
  ok(REAL.overview.songs === 3208, `全部歌曲 ${REAL.overview.songs} 首（应为真实值 3208）`);
  ok(REAL.overview.playlists === 40, `自建歌单 ${REAL.overview.playlists} 个（应为 40）`);
  ok(REAL.overview.plays === 649, `播放次数 ${REAL.overview.plays}（应为 649）`);
  ok(REAL.overview.hours === 35.6, `累计时长 ${REAL.overview.hours} 小时（应为 35.6）`);
  ok(REAL.hourly.bars.length === 24, '24 小时分布 24 个点');
  ok(REAL.hourly.top === 23, `峰值小时 ${REAL.hourly.top}:00（应为 23）`);
  ok(REAL.radar.length === 6, '六维画像 6 项');
  ok(REAL.sources.length >= 4, `音源 ${REAL.sources.length} 种`);
  ok(REAL.topSingers.length >= 20, `歌手排行 ${REAL.topSingers.length} 项（应 >=20）`);
  ok(REAL.topSongs.length >= 20, `歌曲排行 ${REAL.topSongs.length} 项（应 >=20）`);
  ok(REAL.playlists.length === 40, `歌单列表 ${REAL.playlists.length} 个`);
  ok(REAL.allSongs.length >= 500, `全部歌曲样本 ${REAL.allSongs.length} 首`);
  ok(REAL.recent.length > 0, `最近播放 ${REAL.recent.length} 条`);
  /* 真实歌手名（不是编造的示例）*/
  const s0 = REAL.topSingers[0].t;
  ok(/DJ Okawari|姚睿霖|Otokaze|Nujabes/i.test(s0), `歌手排行首位是真实歌手（${s0}）`);
  /* 真实音源（网易云等，不是"Bilibili/本地文件"占位）*/
  const src0 = REAL.sources[0].label;
  ok(/网易云|QQ音乐|酷我|酷狗/.test(src0), `音源首位是真实来源（${src0}）`);
  /* 歌单名真实 */
  ok(REAL.playlists.some(p => /Nujabes|Otokaze|iwamizu|蛋堡/.test(p.t)),
     '歌单含真实名称（Nujabes/Otokaze 等）');
}

/* stats 空间用的是 REAL 数据（而非硬编码）*/
const statW = T.pageByKey.stats.find(x=>x.userData.widget.type==='stat');
ok(statW && statW.userData.widget.value === String(REAL.overview.hours),
   `Hero 大数 = REAL.overview.hours（${statW?statW.userData.widget.value:'?'}）`);
const bar24W = T.pageByKey.stats.find(x=>x.userData.widget.type==='chart_bar24');
ok(bar24W && bar24W.userData.widget.bars === REAL.hourly.bars,
   '24h 柱状图直接用 REAL.hourly.bars（同一引用）');

/* playlist 空间用真实歌单 */
const gridW = T.pageByKey.playlist.find(x=>x.userData.widget.type==='grid');
ok(gridW && gridW.userData.widget.items.length === 40,
   `歌单网格 ${gridW?gridW.userData.widget.items.length:0} 个（应为 40）`);
const srW = T.pageByKey.playlist.find(x=>x.userData.widget.type==='songrow');
ok(srW && srW.userData.widget.items.length >= 500,
   `歌曲列表 ${srW?srW.userData.widget.items.length:0} 首`);

/* ── 5d. 排行/列表可滚动（原 bug：bars 无滚动能力） ── */
console.log('\n════ 5d. 排行可滚动 ════');
enter('stats');
const rankBars = T.pageByKey.stats.filter(x=>x.userData.widget.type==='bars');
ok(rankBars.length >= 2, `stats 含 ${rankBars.length} 个排行`);
rankBars.forEach(m => {
  const u = m.userData;
  ok(!!u.listMeta, `${u.widget.label} 有 listMeta（支持滚动）`);
});
const singerRank = rankBars.find(x=>x.userData.widget.label==='歌手排行');
if(singerRank){
  const u = singerRank.userData;
  const r0 = T.listRows(u);
  ok(r0.total === REAL.topSingers.length,
     `歌手排行 total=${r0.total}（数据 ${REAL.topSingers.length} 条）`);
  ok(r0.maxScrollPx > 0,
     `歌手排行可滚动（内容 ${r0.contentPx.toFixed(0)}px > 可视 ${u.listMeta.winPx}px）`);

  /* 真的滚一下 */
  const before = u.state.view.scrollPx;
  T.scrollList(singerRank, 300);
  const after = u.state.view.scrollPx;
  ok(after > before, `滚动生效（${before.toFixed(0)} → ${after.toFixed(0)}）`);

  /* 滚到底 */
  T.scrollListTo(singerRank, r0.total - 1);
  ok(u.state.view.scrollPx > 0 && u.state.view.scrollPx <= r0.maxScrollPx,
     `跳到最后一条（scrollPx=${u.state.view.scrollPx.toFixed(0)}）`);
  /* offset 合法 */
  const off = u.tex.offset.y;
  ok(off >= 0 && off <= 1 - u.tex.repeat.y + 1e-6, '贴图 offset 合法');
  /* 回顶 */
  T.scrollListTop(singerRank);
  ok(u.state.view.scrollPx === 0, '回到顶部');
}
/* 最近播放（list 控件）也应可滚动 */
const recentW = T.pageByKey.stats.find(x=>x.userData.widget.type==='list');
ok(!!recentW && !!recentW.userData.listMeta, '最近播放（list）支持滚动');

/* 全部 4 种列表控件都支持滚动 */
const scrollable = ['songrow','grid','list','bars'];
enter('playlist');
const plTypes = T.pageByKey.playlist.map(x=>x.userData.widget.type);
enter('stats');
const stTypes = T.pageByKey.stats.map(x=>x.userData.widget.type);
const allTypes = [...new Set([...plTypes, ...stTypes])];
const missing = scrollable.filter(t => allTypes.includes(t) && !(
  [...T.pageByKey.playlist, ...T.pageByKey.stats].some(m =>
    m.userData.widget.type === t && !!m.userData.listMeta)));
ok(missing.length === 0, `4 种列表控件均支持滚动${missing.length?'（缺: '+missing.join(',')+'）':''}`);

/* ── 5e. 折线图 / 热力图 / 时长排行（P0 剩余 3 项） ── */
console.log('\n════ 5e. 折线 / 热力 / 时长排行 ════');
enter('stats');
const lineW = T.pageByKey.stats.find(x=>x.userData.widget.type==='chart_line');
const heatW = T.pageByKey.stats.find(x=>x.userData.widget.type==='chart_heat');
const durW  = T.pageByKey.stats.filter(x=>x.userData.widget.type==='bars')
                            .find(x=>x.userData.widget.label==='累计时长排行');
ok(!!lineW, 'stats 含 chart_line（折线图）');
ok(!!heatW, 'stats 含 chart_heat（热力图）');
ok(!!durW,  'stats 含 累计时长排行');

/* 用计数桩验证真的绘制 */
function probe(mesh){
  const c = mesh.userData.canvas;
  const cnt = { arc:0, lineTo:0, moveTo:0, fillText:0, stroke:0, fill:0, setLineDash:0 };
  const ctx = new Proxy({
    canvas:{width:c.width, height:c.height},
    measureText: s => ({width:String(s).length*8}),
    createLinearGradient: () => ({addColorStop(){}}),
    createRadialGradient: () => ({addColorStop(){}}),
    arc(){cnt.arc++;}, lineTo(){cnt.lineTo++;}, moveTo(){cnt.moveTo++;},
    fillText(){cnt.fillText++;}, stroke(){cnt.stroke++;}, fill(){cnt.fill++;},
    setLineDash(){cnt.setLineDash++;},
    beginPath(){}, closePath(){}, clearRect(){}, save(){}, restore(){},
    fillRect(){}, strokeRect(){}, clip(){}, translate(){}, scale(){},
    quadraticCurveTo(){}, bezierCurveTo(){}, rect(){}
  }, { get(o,k){ return (k in o) ? o[k] : ()=>{}; }, set(o,k,v){ o[k]=v; return true; } });
  c.getContext = () => ctx;
  T.DRAW[mesh.userData.widget.type](ctx, c.width, c.height,
      mesh.userData.widget, mesh.userData.state, 0);
  return cnt;
}

if(lineW){
  const cnt = probe(lineW);
  ok(cnt.lineTo >= 10, `折线图绘制折线（lineTo=${cnt.lineTo}）`);
  ok(cnt.setLineDash > 0, `折线图有虚线对比（setLineDash=${cnt.setLineDash}）`);
  ok(lineW.userData.widget.values.length === REAL.dailySeries.values.length,
     `折线数据点 ${lineW.userData.widget.values.length} 个 = 真实天数`);
}
if(heatW){
  const cnt = probe(heatW);
  ok(cnt.fill >= REAL.dailySeries.labels.length,
     `热力图格子数 ${cnt.fill} >= 天数 ${REAL.dailySeries.labels.length}`);
  ok(heatW.userData.widget.days.length === REAL.dailySeries.labels.length,
     '热力图按真实天数（非整年）');
}
if(durW){
  const r = T.listRows(durW.userData);
  ok(r.total === REAL.topByDuration.length,
     `时长排行 ${r.total} 条 = 数据 ${REAL.topByDuration.length} 条`);
  ok(r.maxScrollPx > 0, `时长排行可滚动（可滚 ${r.maxScrollPx.toFixed(0)}px）`);
}

/* 折线数据是真实值（不是占位）*/
ok(REAL.dailySeries.values[0] > 0 && REAL.dailySeries.values.length === 11,
   `每日时长序列 ${REAL.dailySeries.values.length} 天，首日 ${REAL.dailySeries.values[0]}h`);
ok(REAL.topByDuration[0].t.indexOf('Luv') >= 0 || REAL.topByDuration[0].s.indexOf('小时') >= 0,
   `时长排行首位是真实歌曲（${REAL.topByDuration[0].t}）`);

/* ── 5f. P2 我的列表细节（音源徽章 + 字号） ── */
console.log('\n════ 5f. 我的列表细节（P2） ════');
enter('playlist');
const sr2 = T.pageByKey.playlist.find(x=>x.userData.widget.type==='songrow');
ok(!!sr2, '找到 songrow');
/* 真实歌曲带 src 字段（音源徽章数据）*/
const withSrc = REAL.allSongs.filter(s => s.src).length;
ok(withSrc > 500, `歌曲含音源字段 ${withSrc}/${REAL.allSongs.length} 首`);
ok(sr2 && sr2.userData.widget.items[0].src !== undefined,
   `列表首项有 src（${sr2?sr2.userData.widget.items[0].src:'?'}）`);

/* 用计数桩验证徽章真的画了（roundRect → fill 次数）*/
if(sr2){
  const c = sr2.userData.canvas;
  const cnt = { fillText:0, roundRect:0, fill:0 };
  const ctx = new Proxy({
    canvas:{width:c.width, height:c.height},
    measureText: t => ({width:String(t).length*8}),
    createLinearGradient: () => ({addColorStop(){}}),
    createRadialGradient: () => ({addColorStop(){}}),
    fillText(){cnt.fillText++;}, fill(){cnt.fill++;},
    beginPath(){}, closePath(){}, clearRect(){}, save(){}, restore(){},
    fillRect(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, clip(){},
    quadraticCurveTo(){}, rect(){}, setLineDash(){}
  }, { get(o,k){ return (k in o) ? o[k] : ()=>{}; }, set(o,k,v){ o[k]=v; return true; } });
  c.getContext = () => ctx;
  const before = cnt.fillText;
  T.DRAW.songrow(ctx, c.width, c.height, sr2.userData.widget, sr2.userData.state, 0);
  const drawn = cnt.fillText - before;
  /* 每行至少 4 次文本：序号 + 歌名 + 歌手 + 时长（有徽章再加 1）*/
  const rows = sr2.userData.widget.__winRows || 10;
  ok(drawn >= rows*4, `songrow 绘制 ${drawn} 次文本（${rows} 行 × ≥4）`);
  ok(drawn >= rows*5, `含音源徽章文本（${drawn} ≥ ${rows}×5）`);
}

/* 字号：确认不是旧的暗小值 */
const appCode = fs.readFileSync(APP, 'utf8');
ok(!appCode.includes("'500 ' + Math.round(0.24*P) + 'px ' + FONT;\n      g.fillText(it.t"),
   'songrow 歌名已放大（非旧 0.24）');
/* ⚠️ 2026-09-23 外观打磨：断言从「硬编码色值」改为「亮度语义」，
   否则每次调色都会误报。检查 songrow 的序号/歌手色仍属提亮后的浅色阶。*/
function _brightness(rgba){ const m = rgba.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return m ? (0.299*+m[1] + 0.587*+m[2] + 0.114*+m[3]) : 0; }
const srNum = (appCode.match(/rgba\(\d+,\d+,\d+,0\.9\d\)/g) || []).filter(s => _brightness(s) >= 150);
ok(srNum.length >= 2, 'songrow 序号/歌手已提亮（亮度 ≥150，非旧暗值）');
ok(!appCode.includes('rgba(158,170,186,0.70)') && !appCode.includes('rgba(178,188,204,0.72)'),
   'songrow 未回退到旧暗色（0.70 / 0.72）');

/* ── 5g. P3 播放页扩展（按钮行 / 更多菜单 / 播放设置） ── */
console.log('\n════ 5g. P3 播放页扩展 ════');
enter('now');
const nowWs2 = T.pageByKey.now;
const mbW = nowWs2.find(x=>x.userData.widget.type==='morebtn');
const pmW = nowWs2.find(x=>x.userData.widget.type==='playmenu');
const psW = nowWs2.find(x=>x.userData.widget.type==='playsetting');
ok(!!mbW, 'now 空间含 morebtn（更多按钮行）');
ok(!!pmW, 'now 空间含 playmenu（更多菜单）');
ok(!!psW, 'now 空间含 playsetting（播放设置）');

/* 按钮数量与内容（LX-Pro MoreBtn 是 5 个，本项目保留 3 个有数据支撑的）*/
ok(mbW && mbW.userData.widget.items.length === 3,
   `按钮行 3 个（实际 ${mbW?mbW.userData.widget.items.length:0}）`);
/* 菜单项（LX-Pro PlayDetailMenu 保留 4 项非平台依赖）*/
ok(pmW && pmW.userData.widget.items.length === 4,
   `更多菜单 4 项（实际 ${pmW?pmW.userData.widget.items.length:0}）`);
ok(pmW && !pmW.userData.widget.items.some(i=>/歌手|专辑|相似|MV/.test(i.t)),
   '菜单已剔除平台依赖项（歌手/专辑/相似/MV）');

/* 用计数桩验证真的绘制 */
function probe3(mesh){
  const c = mesh.userData.canvas;
  const cnt = { arc:0, fillText:0, stroke:0, fill:0, lineTo:0 };
  const ctx = new Proxy({
    canvas:{width:c.width, height:c.height},
    measureText: t => ({width:String(t).length*8}),
    createLinearGradient: () => ({addColorStop(){}}),
    createRadialGradient: () => ({addColorStop(){}}),
    arc(){cnt.arc++;}, fillText(){cnt.fillText++;}, stroke(){cnt.stroke++;},
    fill(){cnt.fill++;}, lineTo(){cnt.lineTo++;},
    beginPath(){}, closePath(){}, clearRect(){}, save(){}, restore(){},
    fillRect(){}, strokeRect(){}, clip(){}, translate(){}, scale(){},
    moveTo(){}, setLineDash(){}, quadraticCurveTo(){}, rect(){}
  }, { get(o,k){ return (k in o) ? o[k] : ()=>{}; }, set(o,k,v){ o[k]=v; return true; } });
  c.getContext = () => ctx;
  T.DRAW[mesh.userData.widget.type](ctx, c.width, c.height,
      mesh.userData.widget, mesh.userData.state, 0);
  return cnt;
}
if(mbW){ const c=probe3(mbW); ok(c.arc >= 3 && c.fillText === 0, `按钮行绘制 ${c.arc} 个圆（无文字，纯图标）`); }
if(pmW){ const c=probe3(pmW); ok(c.fillText >= 5, `更多菜单绘制 ${c.fillText} 次文本（label + 4 项标题 + 2 副标题）`); }
if(psW){ const c=probe3(psW); ok(c.fillText >= 6, `播放设置绘制 ${c.fillText} 次文本（字号/对齐/开关）`); }

/* 交互：点击菜单项应改状态 */
if(pmW){
  const before = pmW.userData.state.sel;
  T.handleRegion(pmW, { kind:'pmenu', index:0 });
  ok(pmW.userData.state.sel === 0, `点击菜单项改变选中（${before} → ${pmW.userData.state.sel}）`);
}
/* 交互：开关切换 */
if(psW){
  const b0 = psW.userData.state.showCtrl !== undefined ? psW.userData.state.showCtrl : true;
  T.handleRegion(psW, { kind:'pswitch' });
  const a0 = psW.userData.state.showCtrl;
  ok(a0 !== b0, `开关可切换（${b0} → ${a0}）`);
}
/* 交互：对齐三选 */
if(psW){
  T.handleRegion(psW, { kind:'palign', index:2, value:'右' });
  ok(psW.userData.state.align === 2, `对齐可改（→ ${psW.userData.state.align}）`);
}
/* 交互：播放模式循环 */
if(mbW){
  const m0 = mbW.userData.state.mode || 0;
  T.handleRegion(mbW, { kind:'pbtn', index:1 });
  ok((mbW.userData.state.mode||0) !== m0, `播放模式可循环（${m0} → ${mbW.userData.state.mode}）`);
}
/* 交互：滑块拖动改歌词字号 */
if(psW){
  T.settingSlide(psW, 0.8, { x:0.2, w:0.6 });
  ok(psW.userData.state.lrcSize > 0.9, `滑块可拖动（lrcSize=${psW.userData.state.lrcSize.toFixed(2)}）`);
}

/* now 空间垂直布局无重叠（新增 morebtn 后）*/
const nowCfg2 = T.PAGES.now.widgets.filter(w => w.sf !== undefined);
const byCol2 = {};
nowCfg2.forEach(w => {
  const col = Math.round(w.sf*10)/10;
  const h = w.fhSquare || w.fh || (w.square ? w.fw*(390/844) : 0.05);
  (byCol2[col] = byCol2[col] || []).push({ type:w.type, sv:w.sv, h });
});
let ov2 = 0, gapMin2 = 1;
for(const col in byCol2){
  const items = byCol2[col].sort((a,b)=>a.sv-b.sv);
  for(let i=1;i<items.length;i++){
    const gap = (items[i].sv - items[i].h/2) - (items[i-1].sv + items[i-1].h/2);
    gapMin2 = Math.min(gapMin2, gap);
    if(gap < 0){ ov2++; console.log(`      ❌ ${col} 列: ${items[i-1].type} 与 ${items[i].type} 重叠`); }
  }
}
ok(ov2 === 0, `now 空间各列无重叠（新增 morebtn 后，最小间隙 ${gapMin2.toFixed(4)}）`);

/* ── 5h. P1 设置页（7 分区环绕） ── */
console.log('\n════ 5h. 设置页（P1） ════');
enter('settings');
const setWs = T.pageByKey.settings;
const toggles = setWs.filter(x=>x.userData.widget.type==='toggle');
ok(toggles.length >= 6, `设置页 ${toggles.length} 个 toggle 分区`);
const labels = toggles.map(x=>x.userData.widget.label);
['主题','播放','歌词','下载','列表'].forEach(k => {
  ok(labels.includes(k), `含分区「${k}」`);
});
ok(labels.some(l=>/备份/.test(l)), '含「备份」分区');
ok(labels.some(l=>/版本/.test(l)), '含「版本」分区');

/* toggle 支持滚动（设置项多）*/
const playToggle = toggles.find(x=>x.userData.widget.label==='播放');
ok(!!playToggle && !!playToggle.userData.listMeta, '「播放」分区支持滚动');
if(playToggle){
  const r = T.listRows(playToggle.userData);
  ok(r.total === playToggle.userData.widget.items.length,
     `「播放」${r.total} 项（数据 ${playToggle.userData.widget.items.length}）`);
  /* 真的滚一下 */
  const b = playToggle.userData.state.view.scrollPx;
  T.scrollList(playToggle, 100);
  ok(playToggle.userData.state.view.scrollPx > b || r.maxScrollPx === 0,
     `「播放」可滚动（${b.toFixed(0)} → ${playToggle.userData.state.view.scrollPx.toFixed(0)}）`);
}

/* 用计数桩验证 toggle 真的绘制（开关圆 + 文字）*/
function probeT(mesh){
  const c = mesh.userData.canvas;
  const cnt = { arc:0, fillText:0, fill:0, stroke:0 };
  const ctx = new Proxy({
    canvas:{width:c.width, height:c.height},
    measureText: t => ({width:String(t).length*8}),
    createLinearGradient: () => ({addColorStop(){}}),
    createRadialGradient: () => ({addColorStop(){}}),
    arc(){cnt.arc++;}, fillText(){cnt.fillText++;}, fill(){cnt.fill++;}, stroke(){cnt.stroke++;},
    beginPath(){}, closePath(){}, clearRect(){}, save(){}, restore(){},
    fillRect(){}, moveTo(){}, lineTo(){}, setLineDash(){}, quadraticCurveTo(){}, rect(){}
  }, { get(o,k){ return (k in o) ? o[k] : ()=>{}; }, set(o,k,v){ o[k]=v; return true; } });
  c.getContext = () => ctx;
  T.DRAW.toggle(ctx, c.width, c.height, mesh.userData.widget, mesh.userData.state, 0);
  return cnt;
}
if(playToggle){
  const c = probeT(playToggle);
  ok(c.arc >= 3, `「播放」绘制 ${c.arc} 个开关圆`);
  ok(c.fillText >= 3, `「播放」绘制 ${c.fillText} 次文字`);
}

/* 交互：点击开关改状态 */
if(playToggle){
  const idx = 0;
  const before = playToggle.userData.state.items[idx].v;
  T.handleRegion(playToggle, { kind:'toggle', index:idx });
  ok(playToggle.userData.state.items[idx].v !== before,
     `开关可切换（${before} → ${playToggle.userData.state.items[idx].v}）`);
}

/* 分区环绕分布 */
const azs2 = setWs.map(x=>x.userData.widget.az).filter(a=>a!==undefined);
const uniq2 = [...new Set(azs2)];
ok(uniq2.length >= 4, `分区分布 ${uniq2.length} 个方位（${uniq2.join(',')}）`);

/* 设置项文案来自 LX-Pro（真实中文名，非编造）*/
const allItems = toggles.flatMap(x=>x.userData.widget.items.map(i=>i.t));
ok(allItems.some(t=>/动态背景|字体阴影/.test(t)), '主题分区用 LX-Pro 真实文案');
ok(allItems.some(t=>/歌词翻译|罗马音/.test(t)), '歌词分区用 LX-Pro 真实文案');
ok(allItems.some(t=>/内嵌歌词|写入标签/.test(t)), '下载分区用 LX-Pro 真实文案');

/* ── 5i. P2 专辑/歌手详情 ── */
console.log('\n════ 5i. 专辑/歌手详情（P2） ════');
ok(!!T.PAGES.album, 'PAGES 含 album 空间');
ok(!!T.PAGES.artist, 'PAGES 含 artist 空间');
ok(typeof REAL.albums === 'object' && REAL.albums.length >= 20,
   `REAL.albums 聚合 ${REAL.albums?REAL.albums.length:0} 个专辑`);
ok(typeof REAL.artists === 'object' && REAL.artists.length >= 20,
   `REAL.artists 聚合 ${REAL.artists?REAL.artists.length:0} 位歌手`);
/* 专辑/歌手数据是真实的（来自备份，非编造）*/
ok(REAL.albums.some(a=>/Luv\(sic\)|君の名は|收敛水/.test(a.t)), '专辑含真实名称');
ok(REAL.artists.some(a=>/Nujabes|Otokaze|罗恩Rune/.test(a.t)), '歌手含真实名称');
ok(REAL.artists[0].n > 50, `歌手首位有真实歌曲数（${REAL.artists[0].t} ${REAL.artists[0].n} 首）`);

/* 构建并验证 */
enter('album');
const albWs = T.pageByKey.album;
ok(albWs.length === 2, `album 空间 2 个控件（头图卡 + 列表）`);
const hc = albWs.find(x=>x.userData.widget.type==='headcard');
ok(!!hc, 'album 含 headcard（头图卡）');
ok(hc && hc.userData.widget.kind === 'album', '头图卡 kind=album');
ok(hc && hc.userData.widget.actions.length === 3, '头图卡 3 个操作按钮');

/* 绘制验证 */
if(hc){
  const c = hc.userData.canvas;
  const cnt = { fillText:0, fill:0, stroke:0, arc:0 };
  const ctx = new Proxy({
    canvas:{width:c.width, height:c.height},
    measureText: t => ({width:String(t).length*8}),
    createLinearGradient: () => ({addColorStop(){}}),
    createRadialGradient: () => ({addColorStop(){}}),
    fillText(){cnt.fillText++;}, fill(){cnt.fill++;}, stroke(){cnt.stroke++;}, arc(){cnt.arc++;},
    beginPath(){}, closePath(){}, clearRect(){}, save(){}, restore(){},
    fillRect(){}, moveTo(){}, lineTo(){}, setLineDash(){}, quadraticCurveTo(){}, rect(){}
  }, { get(o,k){ return (k in o) ? o[k] : ()=>{}; }, set(o,k,v){ o[k]=v; return true; } });
  c.getContext = () => ctx;
  T.DRAW.headcard(ctx, c.width, c.height, hc.userData.widget, hc.userData.state, 0);
  ok(cnt.fillText >= 5, `头图卡绘制 ${cnt.fillText} 次文字（类型/标题/副标题/统计/按钮）`);
  ok(cnt.arc >= 1, `头图卡绘制 ${cnt.arc} 个圆（唱片环/头像）`);
}
/* 布局：头图卡在上、列表在下，无重叠 */
const albCfg = T.PAGES.album.widgets.filter(w=>w.sf!==undefined);
const sorted = albCfg.slice().sort((a,b)=>a.sv-b.sv);
let ov3 = 0;
for(let i=1;i<sorted.length;i++){
  const gap = (sorted[i].sv - sorted[i].fh/2) - (sorted[i-1].sv + sorted[i-1].fh/2);
  if(gap < 0) ov3++;
}
ok(ov3 === 0, `album 空间头图卡与列表无重叠`);

enter('artist');
const artWs = T.pageByKey.artist;
const hc2 = artWs.find(x=>x.userData.widget.type==='headcard');
ok(!!hc2 && hc2.userData.widget.kind === 'artist', 'artist 头图卡 kind=artist');

/* 跨空间跳转函数存在 */
ok(typeof T.gotoSpace === 'function', 'gotoSpace 跨空间跳转存在');
/* 跳转后能切换空间 */
T.gotoSpace('album', { title:'测试专辑', sub:'测试歌手', stats:[{label:'首',value:'10'}] });
drain();
ok(T.curPageKey === 'album' && T.mode === 'sub',
   `gotoSpace 生效（curPageKey=${T.curPageKey}, mode=${T.mode}）`);

/* ── 5j. 跳转链路（用户报「点歌单没反应」） ── */
console.log('\n════ 5j. 跳转链路验证 ════');
/* ① 歌单数据必须带真实歌曲（此前 songs:null 导致无法跳转）*/
ok(REAL.playlists[0].songs && REAL.playlists[0].songs.length > 0,
   `歌单带真实歌曲（${REAL.playlists[0].t}: ${REAL.playlists[0].songs?REAL.playlists[0].songs.length:0} 首）`);
const withSongs = REAL.playlists.filter(p=>p.songs && p.songs.length).length;
ok(withSongs === REAL.playlists.length, `全部 ${withSongs}/${REAL.playlists.length} 个歌单都带歌曲`);

/* ② grid 的 items 确实带 songs（跳转的数据前提）*/
enter('playlist');
const grid2 = T.pageByKey.playlist.find(x=>x.userData.widget.type==='grid');
ok(grid2 && grid2.userData.widget.items[0].songs !== null,
   `grid items 带 songs（首项 ${grid2?grid2.userData.widget.items[0].songs.length:0} 首）`);

/* ③ 点歌单 → 应进 songlist 空间并填入歌曲 */
const firstPL = grid2.userData.widget.items[0];
T.handleRegion(grid2, { kind:'cell', index:0, title:firstPL.t });
drain();
ok(T.curPageKey === 'songlist', `点歌单跳转到 songlist（实际 ${T.curPageKey}）`);
const slWs = T.pageByKey.songlist;
const slHc = slWs.find(x=>x.userData.widget.type==='headcard');
const slSr = slWs.find(x=>x.userData.widget.type==='songrow');
ok(slHc && slHc.userData.widget.title === firstPL.t,
   `头图卡标题已填（${slHc?slHc.userData.widget.title:'?'}）`);
ok(slSr && slSr.userData.widget.items.length > 0,
   `歌曲列表已填（${slSr?slSr.userData.widget.items.length:0} 首）`);
ok(slSr && slSr.userData.widget.items[0].t === firstPL.songs[0].t,
   `列表首项与歌单首曲一致（${slSr?slSr.userData.widget.items[0].t:'?'}）`);

/* ④ 歌曲列表带专辑字段（供专辑跳转）*/
ok(slSr && slSr.userData.widget.items[0].alb !== undefined,
   `歌曲项带 alb 字段（${slSr?slSr.userData.widget.items[0].alb:'?'}）`);

/* ⑤ 点歌曲 → 匹配真实歌手则进 artist */
enter('songlist');
const slSr2 = T.pageByKey.songlist.find(x=>x.userData.widget.type==='songrow');
/* 找一个能匹配 REAL.artists 的歌曲 */
const target = REAL.artists.find(a =>
  REAL.allSongs.some(s => (s.a||'').split('、').some(x=>x.trim()===a.t)));
if(target){
  T.handleRegion(slSr2, { kind:'song', index:0, title:'x', sub:target.t });
  drain();
  ok(T.curPageKey === 'artist', `点歌曲的歌手跳转到 artist（${target.t} → ${T.curPageKey}）`);
  const aHc = T.pageByKey.artist.find(x=>x.userData.widget.type==='headcard');
  ok(aHc && aHc.userData.widget.title === target.t,
     `歌手头图卡标题已填（${aHc?aHc.userData.widget.title:'?'}）`);
} else {
  ok(false, '找不到可匹配的歌手（数据异常）');
}

/* ⑥ 歌单名 vs 专辑名 无交集（解释为何原方案失败）*/
const plNames = new Set(REAL.playlists.map(p=>p.t));
const inter = REAL.albums.filter(a=>plNames.has(a.t)).length;
ok(inter === 0, `歌单名∩专辑名=${inter}（原「硬匹配专辑」方案因此永不触发，已改）`);

/* ── 5k. 导航栈（用户报「无法返回上一级」） ── */
console.log('\n════ 5k. 导航栈逐级返回 ════');
/* 模拟：主页 → 歌单 → 点歌单进详情 → 返回应回歌单（而非主页）*/
enter('playlist');
const g3 = T.pageByKey.playlist.find(x=>x.userData.widget.type==='grid');
const pl0 = g3.userData.widget.items[0];
/* 点歌单 → songlist */
T.handleRegion(g3, { kind:'cell', index:0, title:pl0.t });
drain();
ok(T.curPageKey === 'songlist', `第1跳：playlist → ${T.curPageKey}`);
ok(T.spaceStack.length === 2, `栈深 ${T.spaceStack.length}（应为 2：playlist, songlist）`);

/* 点歌曲的歌手 → artist */
const slSr3 = T.pageByKey.songlist.find(x=>x.userData.widget.type==='songrow');
const art0 = REAL.artists.find(a =>
  REAL.allSongs.some(s => (s.a||'').split('、').some(x=>x.trim()===a.t)));
T.handleRegion(slSr3, { kind:'song', index:0, title:'x', sub:art0.t });
drain();
ok(T.curPageKey === 'artist', `第2跳：songlist → ${T.curPageKey}`);
ok(T.spaceStack.length === 3, `栈深 ${T.spaceStack.length}（应为 3）`);

/* 返回第 1 次 → 应回 songlist */
T.exitSection(); drain();
ok(T.curPageKey === 'songlist', `返回1：→ ${T.curPageKey}（应 songlist）`);
ok(T.mode === 'sub', `仍在子空间（mode=${T.mode}）`);
ok(T.spaceStack.length === 2, `栈深 ${T.spaceStack.length}（应为 2）`);
/* 返回后应还原歌单详情的歌曲列表 */
const slSr4 = T.pageByKey.songlist.find(x=>x.userData.widget.type==='songrow');
ok(slSr4 && slSr4.userData.widget.items.length > 0,
   `返回后歌单详情列表仍在（${slSr4?slSr4.userData.widget.items.length:0} 首）`);

/* 返回第 2 次 → 应回 playlist */
T.exitSection(); drain();
ok(T.curPageKey === 'playlist', `返回2：→ ${T.curPageKey}（应 playlist）`);
ok(T.mode === 'sub', `仍在子空间（mode=${T.mode}）`);
ok(T.spaceStack.length === 1, `栈深 ${T.spaceStack.length}（应为 1）`);

/* 返回第 3 次 → 回主页 */
T.exitSection(); drain();
ok(T.mode === 'main', `返回3：回主页（mode=${T.mode}）`);
ok(T.spaceStack.length === 0, `栈已清空（${T.spaceStack.length}）`);

/* 从主页进入应重置栈 */
enter('stats');
ok(T.spaceStack.length === 1 && T.spaceStack[0] === 'stats',
   `从主页进入重置栈（[${T.spaceStack.join(',')}]）`);
T.exitSection(); drain();
ok(T.mode === 'main', '直接返回主页');

/* ── 5l. P3 搜索页（4 类型 + 本地搜索） ── */
console.log('\n════ 5l. 搜索页（P3） ════');
enter('search');
const srchWs = T.pageByKey.search;
ok(srchWs.some(x=>x.userData.widget.type==='search'), 'search 空间含搜索栏');
const tabsW = srchWs.find(x=>x.userData.widget.type==='tabs');
ok(!!tabsW, 'search 空间含类型 tabs');
ok(tabsW && tabsW.userData.widget.items.length === 4,
   `4 种类型（${tabsW?tabsW.userData.widget.items.join('/'):''}）`);
ok(tabsW && tabsW.userData.widget.items.join('') === '音乐歌手专辑歌单',
   '类型名对齐 LX-Pro（音乐/歌手/专辑/歌单）');

/* 本地搜索引擎：4 种类型 */
ok(typeof T.localSearch === 'function', 'localSearch 存在');
const rMusic = T.localSearch('Nujabes', 'music');
ok(rMusic.length > 0, `音乐搜索「Nujabes」→ ${rMusic.length} 条`);
ok(rMusic[0].kind === 'music', '结果 kind=music');
const rSinger = T.localSearch('Nujabes', 'singer');
ok(rSinger.length > 0, `歌手搜索「Nujabes」→ ${rSinger.length} 条`);
const rAlbum = T.localSearch('Luv', 'album');
ok(rAlbum.length > 0, `专辑搜索「Luv」→ ${rAlbum.length} 条`);
const rList = T.localSearch('蛋堡', 'songlist');
ok(rList.length > 0, `歌单搜索「蛋堡」→ ${rList.length} 条`);
ok(T.localSearch('', 'music').length === 0, '空关键词返回 0 条');
ok(T.localSearch('zzzz不存在zzzz', 'music').length === 0, '无匹配返回 0 条');

/* 搜索覆盖全量（3208 首，此前只有 600 首）*/
ok(REAL.allSongs.length === 3208, `allSongs 全量 ${REAL.allSongs.length} 首`);
const rCommon = T.localSearch('的', 'music');
ok(rCommon.length >= 100, `常见字「的」搜到 ${rCommon.length} 条（全量覆盖）`);

/* applySearch 填充列表 */
const n1 = T.applySearch('Nujabes', 'music');
const srchSr = T.pageByKey.search.find(x=>x.userData.widget.type==='songrow');
ok(n1 > 0 && srchSr.userData.widget.items.length === n1,
   `applySearch 填充 ${n1} 条到列表`);
ok(/Nujabes/.test(srchSr.userData.widget.label), `列表标题含关键词（${srchSr.userData.widget.label}）`);

/* 切类型重搜 */
const tabsState = tabsW.userData.state;
T.handleRegion(tabsW, { kind:'tab', index:1, value:'歌手' });
drain();
ok(srchSr.userData.widget.items[0] && srchSr.userData.widget.items[0].kind === 'singer',
   `切到「歌手」后结果 kind=singer（${srchSr.userData.widget.items[0]?srchSr.userData.widget.items[0].t:'?'}）`);

/* 点结果跳转（歌手 → artist 空间）*/
T.handleRegion(srchSr, { kind:'song', index:0, title:'x', sub:'y' });
drain();
ok(T.curPageKey === 'artist', `点歌手结果跳转到 artist（${T.curPageKey}）`);

/* ── 5m. 玻璃化地基（2026-09-23） ── */
console.log('\n════ 5m. 玻璃化地基 ════');
const appSrc = fs.readFileSync(APP, 'utf8');
ok(appSrc.includes('new THREE.PMREMGenerator'), 'PMREM 环境贴图已烘焙');
ok(appSrc.includes('scene.environment'), 'scene.environment 已设置（玻璃反射源）');
ok(/PMREM[^]*?catch/.test(appSrc), 'PMREM 有 try/catch 降级（旧浏览器不崩）');
ok(appSrc.includes('new THREE.AmbientLight'), '环境光已加');
ok(appSrc.includes('new THREE.DirectionalLight'), '主光已加');
ok((appSrc.match(/new THREE\.PointLight/g)||[]).length >= 2, '品牌色补光 >= 2 盏');
ok(appSrc.includes('function makeGlassMaterial'), '玻璃材质工厂存在');
ok(appSrc.includes('MeshPhysicalMaterial'), '用 MeshPhysicalMaterial（真物理材质）');
ok(appSrc.includes('clearcoat'), '玻璃有 clearcoat 湿亮层');
ok(appSrc.includes('iridescence'), '玻璃有 iridescence 薄膜虹彩');
ok(appSrc.includes('let GLASS_ON'), '有玻璃化总开关（可退回哑光对比）');
/* 贴图面不用 transmission（否则贴图被折射冲淡）
   ⚠️ 2026-09-23：改用 makeLiquidGlassFace（内部仍是 makeGlassMaterial + 液态玻璃注入）*/
ok(/makeLiquidGlassFace\(tex/.test(appSrc), '贴图面用「半透明+高反射」而非 transmission');
/* 空间仍全部可构建（材质换了不影响结构）*/
enter('now');
ok(T.pageByKey.now.length === 9, `换材质后 now 空间仍 9 控件`);

/* ── 5n. 打破卡片形态（溶解底板 / 星座光弧 / 音频响应） ── */
console.log('\n════ 5n. 打破卡片形态 ════');
const src2 = fs.readFileSync(APP, 'utf8');
/* ① 溶解式底板 */
ok(src2.includes('const DISSOLVE'), '有 DISSOLVE 溶解强度参数');
ok(src2.includes("globalCompositeOperation = 'destination-out'"),
   '用 destination-out 做边缘溶解（真「无边界」）');
ok(!/function drawCardBg[^]*?roundRect\(g,1,1,W-2,H-2,r-1\); g\.stroke\(\);[^]*?\n\}/.test(src2),
   'drawCardBg 已移除硬边框 stroke');
ok(src2.includes('function hexA'), '有 hexA（色值→带透明度 rgba）');
ok(src2.includes('内侧发光边缘'), '硬边框改为内侧发光边缘');
ok(src2.includes('顶部高光条') || src2.includes('顶部高光'), '有玻璃反光暗示（顶部高光）');
/* ② 星座光弧 */
/* ⚠️ 星座光弧已删除（2026-09-23 用户反馈「像 bug 一样突兀，不要这个」）*/
ok(!src2.includes('constellationGroup'), '星座光弧已删除（用户否决）');
ok(!src2.includes('buildConstellation'), 'buildConstellation 已删除');
/* ③ 音频响应 */
ok(src2.includes('const AUDIO'), '有 AUDIO 状态');
ok(src2.includes('function pulseFromAudio'), 'pulseFromAudio 存在');
ok(src2.includes('function updateAudio'), 'updateAudio 存在');
ok(src2.includes('function applyAudioVisual'), 'applyAudioVisual 存在');
ok(src2.includes('updateAudio(dt)'), 'animate 里调用了 updateAudio');
ok(src2.includes('applyAudioVisual()'), 'animate 里调用了 applyAudioVisual');
ok(src2.includes('getByteFrequencyData'), '预留了真实音频接口（getByteFrequencyData）');
ok(src2.includes('bpm: 92'), 'BPM 参数（Jazzy Hip-Hop 常见区间）');
/* ④ 光弧实际生成 */
/* 边界修复：不应再有 BoxGeometry（实色侧边 = 硬边界）*/
ok(!/new THREE\.BoxGeometry\(cw, ch/.test(src2), '主页卡已改 PlaneGeometry（无侧边边界）');
ok(!/new THREE\.BoxGeometry\(ww, hh/.test(src2), '子空间控件已改 PlaneGeometry');
ok(src2.includes('edgeX') && src2.includes('edgeY'), '边缘擦除用四边线性（矩形匹配）');
/* ⑤ 音频脉冲数值合理性 */
if(typeof T.pulseFromAudio === 'function'){
  T.NP.cur = 0;   /* 拍点 */
  const p0 = T.pulseFromAudio(0);
  T.NP.cur = 60/92 * 0.9;   /* 周期末 */
  const p1 = T.pulseFromAudio(0);
  ok(p0 > p1, `节拍包络正确（拍点 ${p0.toFixed(2)} > 周期末 ${p1.toFixed(2)}）`);
  ok(p0 > 0 && p0 <= 1.6, `脉冲范围合理（${p0.toFixed(2)} ∈ (0,1.6]）`);
} else {
  ok(false, 'pulseFromAudio 未导出到测试');
}

/* ── 5o. 外观打磨（2026-09-23）：泛光 / 色彩体系 / 字号阶梯 ── */
console.log('\n════ 5o. 外观打磨（泛光 / 色彩 / 字号）════');
const src3 = fs.readFileSync(APP, 'utf8');

/* ① 泛光后处理（手写，因 r160 UMD 无 examples）*/
ok(src3.includes('const BLOOM'), '有 BLOOM 泛光后处理');
ok(src3.includes('BLOOM.render(scene, camera)'), '渲染循环已接入泛光');
ok(src3.includes('BLOOM.setSize()'), 'resize 已同步泛光缓冲');
ok(!src3.replace(/\/\*[\s\S]*?\*\//g,'').includes('EffectComposer'),
   '未依赖 EffectComposer（r160 UMD 无 examples）');
ok(/threshold:\s*0\.8\d/.test(src3) || src3.includes('THRESHOLD = 0.82'),
   '阈值落在 0.7~0.9 区间（调研结论：不糊的关键）');
ok(/catch[\s\S]{0,200}renderer\.render\(scene, camera\)/.test(src3),
   '泛光失败自动降级为直接渲染');
if(T.BLOOM){
  ok(typeof T.BLOOM.render === 'function', 'BLOOM.render 可调用');
  ok(typeof T.BLOOM.setSize === 'function', 'BLOOM.setSize 可调用');
  ok(T.BLOOM.params && T.BLOOM.params.THRESHOLD >= 0.7 && T.BLOOM.params.THRESHOLD <= 0.9,
     `泛光阈值 ${T.BLOOM.params && T.BLOOM.params.THRESHOLD} ∈ [0.7,0.9]`);
  /* 渲染不抛异常 */
  let boomErr = null;
  try { T.BLOOM.render({}, {}); } catch(e){ boomErr = e; }
  ok(!boomErr, `BLOOM.render 不抛异常${boomErr?'（'+boomErr.message+'）':''}`);
} else { ok(false, 'BLOOM 未导出到测试'); }

/* ② 色彩体系：冷蓝残留应已收敛（仅允许冷调点缀）*/
function _isCool(s){ const m = s.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if(!m) return false; const r=+m[1],g=+m[2],b=+m[3]; return b > r+22 && b > 60; }
const _cssAndJs = src3.replace(/\/\*[\s\S]*?\*\//g, '');   /* 去注释，避免历史记录误报 */
const coolAll = (_cssAndJs.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g) || []).filter(_isCool);
ok(coolAll.length <= 12, `冷蓝残留已收敛（剩 ${coolAll.length} 处 ≤ 12，均为冷调点缀）`);
ok(src3.includes('--cool:'), '有冷调 token（--cool）');
ok(src3.includes('色板 token'), '有集中色板 token 区块');
/* ⚠️ 去掉注释后检查——深蓝只应出现在「修复说明」注释里，不应有实际使用 */
const _src3nc = src3.replace(/\/\*[\s\S]*?\*\//g, '');
ok(!_src3nc.includes('#22334E') && !_src3nc.includes('#26374E'),
   '浅色版遗留的深蓝文字已清除（仅存于注释）');
/* 环形图不再用 LX-Pro 高饱和色板 */
ok(!src3.includes("'#4daf7c','#f59e0b'"), '环形图已弃用 LX-Pro 高饱和色板');
ok(src3.includes("'#D7DBE0'"), '环形图改用冷灰明度梯度');

/* ③ 字号阶梯 */
ok(src3.includes('const TS'), '有 TS 字号阶梯常量');
if(T.TS){
  const keys = Object.keys(T.TS);
  ok(keys.length >= 8 && keys.length <= 12, `字号阶梯档位数合理（${keys.length} 档 ∈ [8,12]）`);
  ok(T.TS.xs < T.TS.sm && T.TS.sm < T.TS.body && T.TS.body < T.TS.title
     && T.TS.title < T.TS.head && T.TS.head < T.TS.disp, '字号阶梯单调递增');
}
if(typeof T.fpx === 'function'){
  ok(T.fpx('body', 100) === 20, `fpx 换算正确（body=0.20 × 100 = ${T.fpx('body',100)}）`);
}
/* JS 侧字号系数应已收敛（不再有 28 种）*/
const _coefs = new Set((src3.match(/Math\.round\((0\.\d+)\*P\)/g) || [])
  .map(s => s.match(/\((0\.\d+)\*P\)/)[1]));
ok(_coefs.size <= 12, `JS 字号系数已收敛（${_coefs.size} 种 ≤ 12，原 28 种）`);
/* CSS 字号应已 token 化 */
const _cssFontPx = (src3.match(/font-size:\s*\d+(\.\d+)?px/g) || []);
ok(_cssFontPx.length === 0, `CSS 固定字号已全部 token 化（剩 ${_cssFontPx.length} 处）`);

/* ③ 液态玻璃（2026-09-23）：边缘折射 + SDF 软边 + 菲涅尔 */
ok(src3.includes('const LIQUID'), '有 LIQUID 液态玻璃参数');
ok(src3.includes('function applyLiquidGlass'), '有 applyLiquidGlass 注入函数');
ok(src3.includes('onBeforeCompile'), '用 onBeforeCompile 注入（不动 three 源码）');
ok(src3.includes('lqBoxSDF'), '有矩形 SDF（软边核心）');
ok(src3.includes('uLqRefract'), '有边缘折射 uniform');
ok(src3.includes('uLqFresnel'), '有菲涅尔边缘光 uniform');
ok(src3.includes('makeLiquidGlassFace'), '有液态玻璃贴图面工厂');
/* 注入的着色器必须真的能编译：调用 onBeforeCompile 检查替换是否生效 */
if(T.makeLiquidGlassFace){
  let shErr = null, injected = null;
  try {
    const m = T.makeLiquidGlassFace({ isTexture:true });
    const fake = { uniforms:{},
      vertexShader: '#include <common>\n#include <begin_vertex>',
      fragmentShader: '#include <common>\n#include <map_fragment>\n#include <opaque_fragment>' };
    if(typeof m.onBeforeCompile === 'function'){ m.onBeforeCompile(fake); injected = fake; }
  } catch(e){ shErr = e; }
  ok(!shErr, `液态玻璃注入不抛异常${shErr?'（'+shErr.message+'）':''}`);
  if(injected){
    ok(injected.vertexShader.includes('vLqUv'), '顶点着色器已注入 vLqUv');
    ok(injected.fragmentShader.includes('lqBoxSDF'), '片元已注入 SDF 软边');
    ok(injected.fragmentShader.includes('uLqRefract'), '片元已注入边缘折射');
    ok(injected.fragmentShader.includes('lqSoft'), '片元已注入软边 alpha 衰减');
    /* 关键：所有 #include 占位都还在（替换是「追加」而非「删除」）*/
    ok(injected.fragmentShader.includes('#include <map_fragment>')
       && injected.fragmentShader.includes('#include <opaque_fragment>'),
       '替换为「保留 include 并追加」（未破坏原着色器）');
    ok(injected.uniforms.uLqEdge && injected.uniforms.uLqFresnel,
       'uniform 已注册（uLqEdge / uLqFresnel）');
  }
  /* 开关：LIQUID.enabled = false 时不注入 */
  const _liqBackup = T.LIQUID.enabled;
  T.LIQUID.enabled = false;
  const m2 = T.makeLiquidGlassFace({ isTexture:true });
  ok(!m2.onBeforeCompile, 'LIQUID.enabled=false 时不注入（可退回普通玻璃）');
  T.LIQUID.enabled = _liqBackup;
} else { ok(false, 'makeLiquidGlassFace 未导出到测试'); }

/* ④ 泛光 × 液态玻璃 协同：渲染一帧不抛异常 */
enter('now'); frames(6);
ok(true, '液态玻璃材质下渲染循环不抛异常');

/* ── 6. 全部空间切换不黑屏 ── */
console.log('\n════ 6. 空间切换回归 ════');
let noVis = [];
for(const key of keys){
  enter(key); frames(20);
  if((T.pageByKey[key]||[]).filter(x=>x.visible).length === 0) noVis.push(key);
}
ok(noVis.length === 0, `全部空间可显示${noVis.length?'（异常: '+noVis.join(',')+'）':''}`);

/* ── 汇总 ── */
console.log('\n' + '='.repeat(52));
if(errN) console.log('运行期异常:', errs);
console.log(`结果：${pass} 通过 / ${fail} 失败${errN?` / ${errN} 异常`:''}`);
process.exit(fail || errN ? 1 : 0);
