import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id),keys=new Set(),obstacles=[];
try{
const renderer=new T.WebGLRenderer({canvas:$('scene'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#d9e3df');
const camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.1,100);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=12;controls.maxDistance=28;controls.minPolarAngle=.25;controls.maxPolarAngle=1.1;
function view(){camera.position.set(14,17,20);controls.target.set(0,0,0);controls.update();}view();
scene.add(new T.HemisphereLight(0xfff5de,0x708c7b,2.3));
const sun=new T.DirectionalLight(0xffe7bd,3);sun.position.set(-5,14,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12});sun.shadow.normalBias=.03;scene.add(sun);
const mats=new Map();function mat(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.85}));return mats.get(c);}
function box(x,y,z,w,h,d,c,parent=scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function block(x,z,w,d){obstacles.push({x,z,w:w/2+.28,d:d/2+.28});}
box(0,-.25,0,12.4,.5,13,0xc2ab86);box(0,-.55,0,12.8,.15,13.4,0x7d8c7c);
for(let x=-5.5;x<6;x++)for(let z=-5.5;z<6;z++)box(x,.005,z,.98,.025,.98,((x+z)%2===0)?0xe6d8ba:0xe0d0ad);
box(0,1.8,-6,12,.0+3.6,.2,0xf2e8cf);box(-6,1.8,0,.2,3.6,12,0xf2e8cf);
box(0,.55,-5.85,12,1.1,.08,0x6d8779);box(-5.85,.55,0,.08,1.1,12,0x6d8779);
for(const z of [-3,1,4]){box(-5.82,2.25,z,.08,1.65,2.2,0x779eaa);box(-5.74,2.25,z,.12,1.7,.08,0xfef3d9);box(-5.74,2.25,z,.12,.08,2.3,0xfef3d9);box(-5.65,1.38,z,.4,.12,2.4,0xa88254);}
box(0,2.15,-5.78,6.8,1.8,.15,0x9a7048);box(0,2.15,-5.67,6.5,1.55,.06,0x214f46);
const sign=document.createElement('canvas');sign.width=1024;sign.height=256;const ctx=sign.getContext('2d');ctx.fillStyle='#214f46';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#f1e9c9';ctx.font='48px sans-serif';ctx.fillText('觀察・提問・一起找答案',110,100);ctx.font='28px sans-serif';ctx.fillText('自然科學   /   今日練習：校園植物',160,180);
const tex=new T.CanvasTexture(sign);tex.colorSpace=T.SRGBColorSpace;const board=new T.Mesh(new T.PlaneGeometry(6.3,1.5),new T.MeshBasicMaterial({map:tex}));board.position.set(0,2.15,-5.62);scene.add(board);
function person(x,z,color,scale=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);scene.add(g);box(0,.92,0,.48,.65,.3,color,g);const head=new T.Mesh(new T.SphereGeometry(.23,12,10),mat(0xe9b78e));head.position.y=1.5;head.castShadow=true;g.add(head);box(0,1.68,-.03,.43,.17,.38,0x34332d,g);const legs=[box(-.13,.32,0,.17,.64,.2,0x354e57,g),box(.13,.32,0,.17,.64,.2,0x354e57,g)];box(-.34,.95,0,.15,.55,.18,color,g);box(.34,.95,0,.15,.55,.18,color,g);return {g,legs};}
const students=[];
for(const x of [-3.8,-1.3,1.3,3.8])for(const z of [-1.8,.5,2.8]){
box(x,.87,z,1.35,.12,.85,0xb97f4f);for(const dx of [-.52,.52])for(const dz of [-.3,.3])box(x+dx,.43,z+dz,.07,.86,.07,0x435c57);
box(x,.47,z+.72,.68,.1,.65,0xac784e);box(x,.9,z+1,.68,.75,.08,0xac784e);box(x,.97,z,.48,.04,.35,0xeee9d7);block(x,z,1.4,.9);block(x,z+.7,.75,.7);
const p=person(x,z+.7,students.length%2?0xd7b882:0x6e9589,.7);p.g.position.y=.18;p.g.rotation.y=Math.PI;students.push(p);
}
box(1.3,.9,-4.4,2,.16,.9,0xb57b4a);box(1.3,.43,-4.4,1.7,.85,.65,0x637b6a);block(1.3,-4.4,2,.9);
const teacher=person(-2,-4.5,0xc17a54);teacher.g.rotation.y=0;
box(4.8,.7,-5.1,1.3,1.4,.9,0xa9855c);block(4.8,-5.1,1.3,.9);
for(let i=0;i<7;i++)box(4.28+i*.16,1.62,-5.1,.1,.4,.5,[0x577d80,0xcb9a5e,0x963e42][i%3]);
box(0,.04,6,2.3,.05,.6,0x457d68);box(0,-.06,7.2,3,.2,2,0xb0bcb2);
const player=person(0,7.2,0x244e69);const ring=new T.Mesh(new T.RingGeometry(.38,.46,32),new T.MeshBasicMaterial({color:0xe4aa53,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.04;player.g.add(ring);
let inside=false,complete=false,frames=0,elapsed=0,fps=0,walk=0,last=performance.now();
function distance(){return Math.hypot(player.g.position.x+2,player.g.position.z+4.5);}
function refresh(){const atDoor=inside&&Math.hypot(player.g.position.x,player.g.position.z-5.5)<1.3;const near=inside&&distance()<1.8;$('status').textContent=!inside?'01 / 抵達門口。按下進入教室。':complete?'巡課完成。可以自由走動，或從入口返回走廊。':'02 / 沿中央走道前進，靠近黑板左側的陳老師。';$('action').disabled=inside&&!near&&!atDoor;$('action').textContent=!inside?'進入教室':near?'與陳老師交談（E）':atDoor?'返回走廊（E）':'靠近老師後互動';}
function interact(){if($('talk').open)return;if(!inside){inside=true;player.g.position.set(0,0,5.5);}else if(distance()<1.8){keys.clear();$('talk').showModal();}else if(Math.hypot(player.g.position.x,player.g.position.z-5.5)<1.3){inside=false;player.g.position.set(0,0,7.2);}refresh();}
function free(x,z){return x> -5.5&&x<5.5&&z> -5.45&&z<5.75&&!obstacles.some(o=>Math.abs(x-o.x)<o.w&&Math.abs(z-o.z)<o.d)&&Math.hypot(x+2,z+4.5)>.55;}
function move(dx,dz){const p=player.g.position;if(free(p.x+dx,p.z))p.x+=dx;if(free(p.x,p.z+dz))p.z+=dz;}
$('action').onclick=interact;$('close').onclick=()=>{complete=true;$('talk').close();refresh();if(parent!==window)parent.postMessage({type:'campus-classroom-complete'},location.origin);$('scene').focus();};$('talk').addEventListener('close',()=>keys.clear());
$('reset').onclick=()=>{inside=false;complete=false;keys.clear();player.g.position.set(0,0,7.2);refresh();};$('view').onclick=view;
const aliases={ArrowUp:'w',ArrowDown:'s',ArrowLeft:'a',ArrowRight:'d'};
addEventListener('keydown',e=>{if($('talk').open)return;const k=aliases[e.key]||e.key.toLowerCase();if('wasd'.includes(k)&&k.length===1){e.preventDefault();keys.add(k);}if(k==='e'&&!e.repeat)interact();});addEventListener('keyup',e=>keys.delete(aliases[e.key]||e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(b.dataset.key);});
function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=camera.aspect<1?75:42;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();refresh();
renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;let dx=Number(keys.has('d'))-Number(keys.has('a')),dz=Number(keys.has('s'))-Number(keys.has('w'));if(inside&&!$('talk').open&&(dx||dz)){const len=Math.hypot(dx,dz);move(dx/len*dt*2.8,dz/len*dt*2.8);player.g.rotation.y=Math.atan2(dx,dz);walk+=dt*9;player.legs.forEach((l,i)=>l.rotation.x=Math.sin(walk+i*Math.PI)*.35);}else player.legs.forEach(l=>l.rotation.x=0);
students.forEach((p,i)=>p.g.rotation.z=Math.sin(now*.001+i)*.015);controls.update();renderer.render(scene,camera);frames++;elapsed+=dt;if(elapsed>1){fps=Math.round(frames/elapsed);$('perf').textContent=`Three.js r${T.REVISION} · ${fps} FPS`;frames=0;elapsed=0;}refresh();});
addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='campus-classroom-save'){$('error').textContent=e.data.ok?'巡課已存檔。':'巡課存檔失敗，請再次與老師交談後重試。';}});
window.classroom={snapshot:()=>({engine:T.REVISION,inside,complete,position:player.g.position.toArray(),fps,students:students.length,drawCalls:renderer.info.render.calls,camera:camera.position.toArray()})};
}catch(e){$('error').textContent='無法啟動 3D 教室：'+e.message;console.error(e);}
