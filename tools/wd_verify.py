#!/usr/bin/env python3
"""干净的 WebDriver 客户端：打开页面、抓控制台、读状态、截图
用法：python3 /home/hoper/Hoper/LX_Pro_Rebuild_UI/tools/wd_verify.py [url]
"""
import json, subprocess, time, base64, sys, urllib.request

PORT = 4444
def req(method, path, body=None):
    url = "http://127.0.0.1:%d%s" % (PORT, path)
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method,
                               headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read().decode())

proc = subprocess.Popen(['geckodriver', '--port', str(PORT)],
                        stdout=open('/tmp/gecko5.log', 'w'), stderr=subprocess.STDOUT)
time.sleep(4)
try:
    s = req('POST', '/session', {'capabilities': {'alwaysMatch': {
        'browserName': 'firefox', 'moz:firefoxOptions': {'args': ['-headless']}}}})
    sid = s['value']['sessionId']
    print("SID:", sid, flush=True)
    target = sys.argv[1] if len(sys.argv) > 1 else 'file:///tmp/lx_diag.html'
    req('POST', '/session/%s/url' % sid, {'url': target})
    print("打开:", target, "-> 等待 13s", flush=True)
    time.sleep(13)

    probe = """return (function(){
      var d = window.__DIAG || {errs:[],warns:[],logs:[]};
      var p = window.__LXP;
      var out = { errs: d.errs.slice(0,20), warns: d.warns.slice(0,20),
                  relLogs: d.logs.filter(function(x){return /玻璃|泛光|液态|Shader|WebGL|Error/i.test(x);}).slice(0,15),
                  lxpType: typeof p };
      if(p){ try{ out.state = { liquidEnabled: p.LIQUID&&p.LIQUID.enabled,
        bloomEnabled: p.BLOOM&&p.BLOOM.enabled, liquidFailed: p.LIQUID_FAILED,
        glassOn: p.GLASS_ON, cards: p.mainPanels&&p.mainPanels.length,
        cardsVisible: p.mainPanels&&p.mainPanels.filter(function(m){return m.visible}).length,
        liquidMats: p.mainPanels&&p.mainPanels.filter(function(m){return m.material&&m.material.userData&&m.material.userData.liquid}).length,
        mode: p.mode }; }catch(e){ out.stateErr = e.message; } }
      return JSON.stringify(out);
    })();"""
    r = req('POST', '/session/%s/execute/sync' % sid, {'script': probe, 'args': []})
    v = json.loads(r['value'])
    print("\n【控制台错误】", v.get('errs') or '无', flush=True)
    print("【控制台警告】", v.get('warns') or '无', flush=True)
    print("【相关日志】", v.get('relLogs') or '无', flush=True)
    print("【状态】", json.dumps(v.get('state') or v.get('stateErr') or ('__LXP ' + str(v.get('lxpType'))), ensure_ascii=False), flush=True)

    shot = req('GET', '/session/%s/screenshot' % sid)
    b = shot.get('value', '')
    if b:
        open('/tmp/lx_final.png', 'wb').write(base64.b64decode(b))
        print("截图 /tmp/lx_final.png", flush=True)
    req('DELETE', '/session/%s' % sid)
finally:
    proc.terminate()
    print("DONE", flush=True)
