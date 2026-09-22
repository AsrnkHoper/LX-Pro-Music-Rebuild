#!/usr/bin/env python3
"""生成带诊断探针的 app.html 临时副本（供 wd_verify.py 做真实浏览器验证）
用途：把脚本作用域里的 const（BLOOM/LIQUID/mainPanels）暴露到 window，
      并收集 console.error/warn 与 window.onerror，便于 WebDriver 读回。
⚠️ 输出到 prototype/ 目录内（与 three.min.js 同目录）——firefox snap 的
   file:// 访问 /tmp 会返回 500，必须放在工作区内。
输出：prototype/_diag.html（验证完可删，已在 .gitignore）
"""
import os

BASE = '/home/hoper/Hoper/LX_Pro_Rebuild_UI/prototype'
SRC = os.path.join(BASE, 'app.html')
OUT = os.path.join(BASE, '_diag.html')
src = open(SRC, encoding='utf-8').read()

collector = '''<script>
window.__DIAG = { errs: [], warns: [], logs: [] };
window.addEventListener('error', function(e){ window.__DIAG.errs.push('ERR: ' + (e.message||String(e))); });
window.addEventListener('unhandledrejection', function(e){ window.__DIAG.errs.push('REJ: ' + e.reason); });
(function(){ var ce=console.error, cw=console.warn, cl=console.log;
  console.error=function(){ window.__DIAG.errs.push('CE: '+Array.prototype.map.call(arguments,String).join(' ')); ce.apply(console,arguments); };
  console.warn =function(){ window.__DIAG.warns.push('CW: '+Array.prototype.map.call(arguments,String).join(' ')); cw.apply(console,arguments); };
  console.log  =function(){ window.__DIAG.logs.push(Array.prototype.map.call(arguments,String).join(' ')); cl.apply(console,arguments); };
})();
</script>'''
src = src.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + collector, 1)

marker = "/* ---------------- 启动 ---------------- */"
export = '''/* 调试导出（临时副本专用）*/
try{ window.__LXP = {
  get LIQUID(){return LIQUID}, get BLOOM(){return BLOOM},
  get LIQUID_FAILED(){return LIQUID_FAILED}, get GLASS_ON(){return GLASS_ON},
  get mainPanels(){return mainPanels}, get mode(){return mode},
  get scene(){return scene}, get renderer(){return renderer}
}; }catch(e){ window.__LXP = {err:e.message}; }
'''
assert marker in src, 'marker 未找到'
src = src.replace(marker, export + marker, 1)
open(OUT, 'w', encoding='utf-8').write(src)
print('已生成', OUT)
print('访问：file://' + OUT)
