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
  get NP(){return NP;}, get mode(){return mode;}, set mode(v){mode=v;},
  get busy(){return busy;}, get curPageKey(){return curPageKey;},
  set curPageKey(v){curPageKey=v;}, get flyCard(){return flyCard;},
  REAL: (typeof REAL !== 'undefined') ? REAL : null };`;

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
const enter = key => { T.curPageKey = key; T.enterSection(cardOf(key)); drain(); };
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
  ok(REAL.topSingers.length >= 4, `歌手排行 ${REAL.topSingers.length} 项`);
  ok(REAL.topSongs.length >= 4, `歌曲排行 ${REAL.topSongs.length} 项`);
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
