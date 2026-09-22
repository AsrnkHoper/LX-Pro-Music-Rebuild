#!/usr/bin/env python3
"""验证「当前播放页歌词倾斜」改动：进入 now 空间，读回 lyric3d 的实际 tilt 值并截图。

用法：cd ~/Hoper/LX_Pro_Rebuild_UI && python3 tools/verify_now_tilt.py
前置：先跑 tools/make_diag_copy.py 生成 prototype/_diag.html
"""
import json, subprocess, time, base64, os, sys, urllib.request

BASE = '/home/hoper/Hoper/LX_Pro_Rebuild_UI/prototype'
URL = 'file://' + os.path.join(BASE, '_diag.html')
PORT = 4444

def req(method, path, body=None):
    url = "http://127.0.0.1:%d%s" % (PORT, path)
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method,
                               headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(r, timeout=90) as resp:
        return json.loads(resp.read().decode())

proc = subprocess.Popen(['geckodriver', '--port', str(PORT)],
                        stdout=open('/tmp/gecko_tilt.log', 'w'), stderr=subprocess.STDOUT)
time.sleep(4)
try:
    s = req('POST', '/session', {'capabilities': {'alwaysMatch': {
        'browserName': 'firefox', 'moz:firefoxOptions': {'args': ['-headless']}}}})
    sid = s['value']['sessionId']
    print('SID', sid, flush=True)
    req('POST', '/session/%s/url' % sid, {'url': URL})
    time.sleep(12)

    # 进入 now 空间，等转场结束，读回各控件的 tilt / 位置 / 屏幕投影
    script = """return (function(){
      try{
        var p = window.__LXP;
        if(p && typeof p.gotoSpace === 'function'){ p.gotoSpace('now'); return 'ENTERED'; }
        return 'NO_gotoSpace';
      }catch(e){ return 'ERR:'+e.message; }
    })();"""
    # 分两步：先触发进入，再等待并读取
    r = req('POST', '/session/%s/execute/sync' % sid, {'script': script, 'args': []})
    print('触发进入 now:', r.get('value'), flush=True)
    time.sleep(4)   # 等转场（0.4s 冲镜 + 压黑 + 470ms 切换 + 错落）

    read = """return (function(){
      var out = {err:null, widgets:[]};
      try{
        var p = window.__LXP;
        var scene = p.scene;
        var found = [];
        scene.traverse(function(o){
          var u = o.userData || {};
          if(u.widget && u.widget.type){
            var w = u.widget;
            var world = new THREE.Vector3();
            if(o.getWorldPosition) o.getWorldPosition(world);
            found.push({ type:w.type, tilt:(u.tilt===undefined?null:u.tilt),
                         sf:w.sf, sv:w.sv,
                         rotY: o.rotation ? +o.rotation.y.toFixed(4) : null,
                         vis: o.visible,
                         pos:[+o.position.x.toFixed(3), +o.position.y.toFixed(3), +o.position.z.toFixed(3)] });
          }
        });
        out.widgets = found;
        out.mode = p.mode;
        out.diagErrs = (window.__DIAG && window.__DIAG.errs) || [];
      }catch(e){ out.err = e.message; }
      return JSON.stringify(out);
    })();"""
    r2 = req('POST', '/session/%s/execute/sync' % sid, {'script': read, 'args': []})
    v = json.loads(r2['value'])
    print('\n【错误】', v.get('err') or v.get('diagErrs') or '无 ✅', flush=True)
    print('【mode】', v.get('mode'), flush=True)
    print('【控件 tilt / 位置】', flush=True)
    for w in v.get('widgets') or []:
        mark = '  ← 歌词' if w['type'] == 'lyric3d' else ('  ← 封面' if w['type'] == 'cover' else '')
        print('   %-12s tilt=%-7s rotY=%-9s pos=%s vis=%s%s'
              % (w['type'], w['tilt'], w['rotY'], w['pos'], w['vis'], mark), flush=True)

    shot = req('GET', '/session/%s/screenshot' % sid)
    b = shot.get('value', '')
    if b:
        open('/tmp/now_tilt.png', 'wb').write(base64.b64decode(b))
        print('\n截图 /tmp/now_tilt.png', flush=True)
    req('DELETE', '/session/%s' % sid)
finally:
    proc.terminate()
    print('DONE', flush=True)
