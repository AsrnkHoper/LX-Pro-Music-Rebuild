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
  set curPageKey(v){curPageKey=v;}, get flyCard(){return flyCard;} };`;

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

/* ── 5. 播放页迷你歌词 ── */
console.log('\n════ 5. 播放页迷你歌词（新增）════');
enter('now');
const nowWs = T.pageByKey.now;
ok(nowWs.some(x=>x.userData.widget.type==='minilyric'), 'now 空间含 minilyric');
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
