#!/usr/bin/env python3
"""视觉对比验证：生成「全开 / 关泛光 / 关液态玻璃 / 全关」变体，
在同一个 firefox session 内逐个导航截图，输出亮度统计与逐像素差异。

目的：证明 Bloom 与液态玻璃**确实改变了画面**（而非静默失效/编译失败）。
⚠️ headless firefox 走软件 WebGL（llvmpipe），PBR 效果可能与真机有差异，
   数据仅作「是否生效」的客观佐证，观感仍需真机确认。
用法：cd ~/Hoper/LX_Pro_Rebuild_UI && python3 tools/verify_visual.py
"""
import json, subprocess, time, base64, os, urllib.request, struct, zlib

BASE = '/home/hoper/Hoper/LX_Pro_Rebuild_UI/prototype'
SRC = os.path.join(BASE, 'app.html')
src = open(SRC, encoding='utf-8').read()

VARIANTS = {
    'on':        '',
    'no_bloom':  'BLOOM.enabled = false;',
    'no_liquid': 'LIQUID.enabled = false;',
    'off':       'BLOOM.enabled = false; LIQUID.enabled = false;',
}

# ── 生成变体（注入点须在材质创建之前）──
marker = "const mainGroup = new THREE.Group(); scene.add(mainGroup);"
assert marker in src, '注入点未找到'
for name, inj in VARIANTS.items():
    s = src
    if inj:
        s = s.replace(marker, "try{ " + inj + " }catch(e){}\n" + marker, 1)
    open(os.path.join(BASE, '_vis_%s.html' % name), 'w', encoding='utf-8').write(s)
print('已生成 4 个变体')

# ── WebDriver ──
PORT = 4444
def req(method, path, body=None):
    url = "http://127.0.0.1:%d%s" % (PORT, path)
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method,
                               headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(r, timeout=90) as resp:
        return json.loads(resp.read().decode())

def read_png(path):
    data = open(path, 'rb').read(); pos = 8; idat = b''
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos+4])[0]; typ = data[pos+4:pos+8]
        ch = data[pos+8:pos+8+ln]
        if typ == b'IHDR': w, h, bitd, ct = struct.unpack('>IIBB', ch[:10])
        elif typ == b'IDAT': idat += ch
        elif typ == b'IEND': break
        pos += 12 + ln
    raw = zlib.decompress(idat); nch = {0:1,2:3,4:2,6:4}[ct]; stride = w*nch
    out = bytearray(); prev = bytearray(stride); p = 0
    for y in range(h):
        f = raw[p]; p += 1; line = bytearray(raw[p:p+stride]); p += stride
        if f == 1:
            for i in range(nch, stride): line[i] = (line[i] + line[i-nch]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i-nch] if i >= nch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-nch] if i >= nch else 0; b = prev[i]
                c = prev[i-nch] if i >= nch else 0
                pp = a+b-c; pa = abs(pp-a); pb = abs(pp-b); pc = abs(pp-c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out += line; prev = line
    return w, h, nch, bytes(out)

proc = subprocess.Popen(['geckodriver', '--port', str(PORT)],
                        stdout=open('/tmp/gecko_vis.log', 'w'), stderr=subprocess.STDOUT)
time.sleep(4)
try:
    s = req('POST', '/session', {'capabilities': {'alwaysMatch': {
        'browserName': 'firefox', 'moz:firefoxOptions': {'args': ['-headless']}}}})
    sid = s['value']['sessionId']
    print('SID', sid, flush=True)
    for name in VARIANTS:
        url = 'file://' + os.path.join(BASE, '_vis_%s.html' % name)
        req('POST', '/session/%s/url' % sid, {'url': url})
        time.sleep(11)
        shot = req('GET', '/session/%s/screenshot' % sid)
        b = shot.get('value', '')
        open('/tmp/vis_%s.png' % name, 'wb').write(base64.b64decode(b))
        print('  截图 /tmp/vis_%s.png' % name, flush=True)
    req('DELETE', '/session/%s' % sid)
finally:
    proc.terminate()

# ── 统计 ──
print('\n=== 亮度统计 ===')
stats = {}
for name in VARIANTS:
    w, h, ch, px = read_png('/tmp/vis_%s.png' % name)
    tot = 0; ssum = 0; hi = 0; mx = 0
    for y in range(0, h, 3):
        for x in range(0, w, 3):
            i = (y*w+x)*ch
            l = (px[i]*299 + px[i+1]*587 + px[i+2]*114)//1000
            ssum += l; tot += 1; mx = max(mx, l)
            if l > 60: hi += 1
    stats[name] = dict(avg=ssum/tot, hi=hi*100.0/tot, mx=mx, w=w, h=h, ch=ch, px=px)
    print("  %-10s 平均亮度 %6.2f   亮像素(>60) %5.2f%%   最亮 %d"
          % (name, stats[name]['avg'], stats[name]['hi'], mx))

# ── 与「全开」逐像素差异 ──
print('\n=== 与「全开」的差异（证明效果是否生效）===')
b = stats['on']
for name in VARIANTS:
    if name == 'on': continue
    c = stats[name]
    if (c['w'], c['h']) != (b['w'], b['h']):
        print('  %-10s 尺寸不同，跳过' % name); continue
    diff = 0; tot = 0; maxd = 0; nz = 0
    for y in range(0, c['h'], 3):
        for x in range(0, c['w'], 3):
            i = (y*c['w']+x)*c['ch']
            d = abs(c['px'][i]-b['px'][i]) + abs(c['px'][i+1]-b['px'][i+1]) + abs(c['px'][i+2]-b['px'][i+2])
            diff += d; tot += 1; maxd = max(maxd, d)
            if d > 6: nz += 1
    print("  %-10s 平均像素差 %6.2f   最大差 %3d   有差异像素 %5.1f%%"
          % (name, diff/tot, maxd, nz*100.0/tot))
print('\nDONE')
