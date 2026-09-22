/* ============================================================
   app.html 测试桩（最小 THREE + DOM 模拟）
   用途：让 prototype/app.html 的真实函数能在 node 里跑起来，
        用于回归测试（空间构建 / 交互链路 / 滚动 / 惯性）。
   用法：node test/run.js
   ⚠️ 这不是给浏览器用的，仅测试环境。
============================================================ */
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
 clone(){return new V3(this.x,this.y,this.z);}
 normalize(){const l=Math.hypot(this.x,this.y,this.z)||1;this.x/=l;this.y/=l;this.z/=l;return this;}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
 addScalar(s){this.x+=s;this.y+=s;this.z+=s;return this;}
 multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
 addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
 sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
 applyQuaternion(){return this;}
 distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
 length(){return Math.hypot(this.x,this.y,this.z);}
 setScalar(s){this.x=this.y=this.z=s;return this;}
 lookAt(){}}
class Obj{constructor(){this.position=new V3();this.scale=new V3(1,1,1);
 this.rotation={x:0,y:0,z:0,order:'XYZ',set(){}};this.userData={};this.visible=true;
 this.children=[];this.material=null;this.quaternion={invert(){return this;}};}
 add(o){this.children.push(o);return this;} lookAt(){} updateMatrixWorld(){}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class Group extends Obj{}
class Sprite extends Obj{constructor(m){super();this.material=m;}}
class Cam extends Obj{constructor(fov,asp){super();this.fov=fov;this.aspect=asp;}
 updateProjectionMatrix(){}}
class Tex{constructor(c){this.image=c;this.colorSpace='';this.needsUpdate=false;
 this.repeat={x:1,y:1,set(a,b){this.x=a;this.y=b;}};
 this.offset={x:0,y:0,set(a,b){this.x=a;this.y=b;}};}}
function Mat(o){return Object.assign({color:0,opacity:1,map:null,toneMapped:true,fog:true,transparent:false},o);}
class Geo{constructor(){this.attributes={};} setAttribute(k,v){this.attributes[k]=v;}}
class BAttr{constructor(a,n){this.array=a;this.itemSize=n;}}
class Col{setHSL(){return this;}}
/* 后处理相关桩（2026-09-23 泛光）：RenderTarget / 正交相机 / ShaderMaterial */
class RT{constructor(w,h,o){this.width=w;this.height=h;this.texture={isTexture:true};
  this.setSize=(a,b)=>{this.width=a;this.height=b;};}}
class ShaderMat{constructor(o){this.uniforms=(o&&o.uniforms)||{};
  this.vertexShader=(o&&o.vertexShader)||'';this.fragmentShader=(o&&o.fragmentShader)||'';}}

global.THREE={
 WebGLRenderer:class{constructor(o){this.domElement=(o&&o.canvas)||{};}
   setPixelRatio(){} setSize(){} setClearColor(){} render(){} clear(){} setRenderTarget(){}},
 Scene:class extends Obj{},
 FogExp2:class{constructor(c,d){this.color=c;this.density=d;}},
 PerspectiveCamera:Cam,
 CanvasTexture:Tex,
 PlaneGeometry:Geo, BoxGeometry:Geo, CircleGeometry:Geo, RingGeometry:Geo,
 CylinderGeometry:Geo, SphereGeometry:Geo,
 MeshBasicMaterial:class{constructor(o){Object.assign(this,Mat(o));}},
 SpriteMaterial:class{constructor(o){Object.assign(this,Mat(o));}},
 PointsMaterial:class{constructor(o){Object.assign(this,Mat(o));}},
 BufferGeometry:class extends Geo{ setFromPoints(){ return this; } },
 BufferAttribute:BAttr, Points:class extends Obj{},
 Line:class extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}},
 QuadraticBezierCurve3:class{constructor(a,b,c){this.a=a;this.b=b;this.c=c;}
   getPoints(){ return [this.a,this.b,this.c]; }},
 LineBasicMaterial:class{constructor(o){Object.assign(this,Mat(o));}},
 Mesh, Group, Sprite, Vector3:V3,
 /* 玻璃化相关（2026-09-23）：光照 + 物理材质 + PMREM */
 AmbientLight:class extends Obj{constructor(c,i){super();this.color=c;this.intensity=i;}},
 DirectionalLight:class extends Obj{constructor(c,i){super();this.color=c;this.intensity=i;}},
 PointLight:class extends Obj{constructor(c,i,d){super();this.color=c;this.intensity=i;this.distance=d;}},
 HemisphereLight:class extends Obj{constructor(){super();}},
 MeshPhysicalMaterial:class{constructor(o){Object.assign(this,Mat(o));}},
 PMREMGenerator:class{constructor(){} compileEquirectangularShader(){}
   fromScene(){ return { texture:{ isTexture:true } }; } dispose(){}},
 WebGLCubeRenderTarget:class{constructor(){this.texture={};}},
 WebGLRenderTarget:RT,
 OrthographicCamera:Cam,
 ShaderMaterial:ShaderMat,
 LinearFilter:1006, NearestFilter:1003, RGBAFormat:1023, HalfFloatType:1016,
 ClampToEdgeWrapping:1001,
 CubeCamera:class extends Obj{constructor(){super();}},
 BackSide:1, DoubleSide:2, FrontSide:0,
 RepeatWrapping:1000,
 Vector2:class{constructor(x=0,y=0){this.x=x;this.y=y;}},
 Quaternion:class{constructor(){this.x=0;this.y=0;this.z=0;this.w=1;} copy(){return this;} invert(){return this;}},
 Raycaster:class{constructor(){this.ray={};} setFromCamera(){}
   intersectObjects(){ return global.__HIT ? [global.__HIT] : []; }},
 Clock:class{constructor(){this.elapsedTime=0;} getDelta(){return 0.016;}},
 Color:Col,
 MathUtils:{degToRad:d=>d*Math.PI/180, clamp:(v,a,b)=>Math.max(a,Math.min(b,v))},
 AdditiveBlending:2, SRGBColorSpace:'srgb'
};

/* DOM 模拟 */
function makeCtx(w,h){
 const target={canvas:{width:w,height:h},
  measureText:t=>({width:String(t).length*8}),
  createLinearGradient:()=>({addColorStop(){}}),
  createRadialGradient:()=>({addColorStop(){}})};
 return new Proxy(target,{get(t,k){if(k in t)return t[k];
   if(k===Symbol.toPrimitive)return()=>'';return()=>{};},
  set(t,k,v){t[k]=v;return true;}});
}
function fakeEl(tag){
 const el={tagName:tag,style:{},dataset:{},children:[],
  classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  innerHTML:'',textContent:'',value:'',width:0,height:0,
  addEventListener(){},removeEventListener(){},
  appendChild(c){this.children.push(c);return c;},
  focus(){},blur(){},
  getBoundingClientRect(){return{left:0,top:0,width:390,height:844};},
  querySelector(){return fakeEl('div');},querySelectorAll(){return[];},
  getContext(){return makeCtx(this.width||620,this.height||822);}};
 if(tag==='canvas'){ el.width=620; el.height=822; }
 return el;
}
const els={};
global.document={
 getElementById(id){ return els[id]||(els[id]=fakeEl('div')); },
 querySelector(s){ return els['q:'+s]||(els['q:'+s]=fakeEl('div')); },
 querySelectorAll(){ return []; },
 createElement(t){ return fakeEl(t); },
 addEventListener(){},
 body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}}}
};
global.window={innerWidth:390,innerHeight:844,devicePixelRatio:2,addEventListener(){}};
global.innerWidth=390; global.innerHeight=844; global.devicePixelRatio=2;
global.addEventListener=()=>{}; global.requestAnimationFrame=()=>{};
global.performance={now:()=>Date.now()};
global.navigator={userAgent:'node'};
