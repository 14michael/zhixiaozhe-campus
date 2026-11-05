import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {move,safePosition,rayBox} from './collision.js';
export async function createWorld(canvas,onProgress,onTick){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const scene=new T.Scene();scene.background=new T.Color('#b8cfd4');scene.fog=new T.FogExp2('#b8cfd4',.0024);
  scene.add(new T.HemisphereLight(0xdceaf2,0x67694a,2.1));
  const sun=new T.DirectionalLight(0xffe8c4,2.7);sun.position.set(50,85,40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-95,right:95,top:95,bottom:-95,near:1,far:240});sun.shadow.normalBias=.08;scene.add(sun);
  const loader=new GLTFLoader(),textureLoader=new T.TextureLoader(),textures={},materialCache=new Map(),billboards=[];
  const meshes=root=>{const result=[];root.traverse(n=>{if(n.isMesh)result.push(n);});return result;};
  const nodes=root=>{const result=[];root.traverse(n=>result.push(n));return result;};
  const pendingTextures=[];
  function texture(name,scale=1){const key=name+scale;if(!textures[key]){const t=textureLoader.load('./assets/textures/'+name+'.png');t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(scale,scale);t.colorSpace=name.includes('normal')?T.NoColorSpace:T.SRGBColorSpace;t.flipY=false;textures[key]=t;pendingTextures.push(new Promise((resolve,reject)=>{if(t.image?.complete)resolve();else{const poll=setInterval(()=>{if(t.image?.complete){clearInterval(poll);resolve();}},50);setTimeout(()=>{clearInterval(poll);t.image?.complete?resolve():reject(new Error('貼圖載入失敗：'+name));},15000);}}));}return textures[key];}
  function dress(root){meshes(root).forEach(m=>{const name=m.material.name;if(materialCache.has(name))m.material=materialCache.get(name);else{const mat=m.material;if(name==='brick'){mat.color.set('white');mat.map=texture('brick-albedo',.65);mat.normalMap=texture('brick-normal',.65);mat.normalScale.set(.45,.45);}if(name==='stone'||name==='roof'){mat.color.set('white');mat.map=texture(name+'-albedo',.6);}materialCache.set(name,mat);}m.castShadow=true;m.receiveShadow=true;});}
  function pbr(name,color,tex,scale=1){const m=new T.MeshStandardMaterial({name,color,roughness:.9,metalness:0});if(tex)m.map=texture(tex,scale);return m;}
  const grass=pbr('lawn','#d2d8a7','grass-albedo',130),paving=pbr('paving','#ffffff','path-albedo',1),stone=pbr('landscape-stone','#b9b5a2'),metal=pbr('landscape-metal','#273b3a'),asphalt=pbr('asphalt','#606665'),flower=pbr('flowers','#ba8f98'),hedge=pbr('hedge','#415c36');
  function box(name,x,y,z,w,h,d,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.name=name;m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;}
  const ground=new T.Mesh(new T.PlaneGeometry(520,520),grass);ground.name='continuous-campus-ground';ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  function path(x,z,w,d){const m=box('limestone-walkway',x,.025,z,w,.05,d,paving);const uv=m.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/3,uv.getY(i)*d/3);return m;}
  function sign(text,pos,width=7,height=1.1){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#223e38';ctx.fillRect(0,0,1024,128);ctx.strokeStyle='#c7b785';ctx.lineWidth=3;ctx.strokeRect(8,8,1008,112);ctx.fillStyle='#eee6c9';ctx.font='48px Microsoft JhengHei,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const plane=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));plane.position.copy(pos);scene.add(plane);return plane;}
  function disposeSign(m){const i=billboards.indexOf(m);if(i>=0)billboards.splice(i,1);scene.remove(m);m.geometry.dispose();m.material.map.dispose();m.material.dispose();}

  path(0,12,10,137);path(0,-39,64,10);path(0,12,64,11);path(0,51,64,10);path(-27,5,5,110);path(27,5,5,110);path(0,0,26,23);
  box('campus-road',0,.015,82,170,.03,8,asphalt);
  for(let x=-78;x<80;x+=10)box('road-mark',x,.04,82,4,.02,.16,stone);
  const boxes=[];
  function obstacle(x,z,w,d,y=20,walk=true,minY=0){const b={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY,maxY:y,walk};boxes.push(b);return b;}
  const buildings=await fetch('./assets/campus.json').then(r=>{if(!r.ok)throw new Error('校園配置載入失敗');return r.json()});
  let count=0;
  async function model(name){onProgress('載入 Three.js 資產 '+(++count)+'/10');const root=(await loader.loadAsync('./assets/models/'+name+'.glb')).scene;root.name=name;dress(root);scene.add(root);return root;}
  function local(b,x,z){return new T.Vector3(b.x+Math.cos(b.rotation)*x+Math.sin(b.rotation)*z,0,b.z-Math.sin(b.rotation)*x+Math.cos(b.rotation)*z);}
  for(const b of buildings){
    b.root=await model(b.id);b.root.position.set(b.x,0,b.z);b.root.rotation.y=b.rotation;
    const swap=Math.abs(Math.sin(b.rotation))>.5;
    obstacle(b.x,b.z,(swap?b.depth:b.width)+1,(swap?b.width:b.depth)+1,b.floors*3.6+5);
    if(b.id==='admin')obstacle(b.x,b.z,8,8,35,false);
    b.entrance=local(b,0,b.depth/2+4.7);b.npcPosition=local(b,2,b.depth/2+5.2);b.arrival=local(b,0,b.depth/2+8);
    for(const x of [-3,3]){const p=local(b,x,b.depth/2+2.6);obstacle(p.x,p.z,.9,.9,4.5);}
    const roof=local(b,0,b.depth/2+1.6);obstacle(roof.x,roof.z,swap?4.4:7.8,swap?7.8:4.4,6.8,false,4.4);
    const s=sign(b.name,local(b,0,b.depth/2+.5),Math.min(b.width-2,11),1.2);s.position.y=7.1;s.rotation.y=b.rotation;
    path(b.arrival.x,b.arrival.z,swap?12:7,swap?7:12);
  }
  const fountain=await model('fountain');fountain.position.set(0,0,0);obstacle(0,0,9.6,9.6,1.1);
  const jets=[];
  for(let i=0;i<10;i++){const a=i*Math.PI/5,points=[];for(let j=0;j<=12;j++){const t=j/12;points.push(new T.Vector3(Math.cos(a)*t*3.3,2.55+2.1*t-3.8*t*t,Math.sin(a)*t*3.3));}const jet=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.032,5,false));scene.add(jet);jet.material=pbr('water-stream-'+i,'#b9dbd4');jet.material.transparent=true;jet.material.opacity=.65;jets.push(jet);}
  const treeSource=await model('tree');treeSource.visible=false;const trees=[];
  let seed=2301;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
  const treePoints=[];
  for(const x of [-20,20])for(const z of [-31,-16,28,42,65])treePoints.push([x,z]);
  for(const x of [-65,65])for(let z=-61;z<75;z+=16)treePoints.push([x,z]);
  for(let x=-48;x<=48;x+=16)treePoints.push([x,-73]);
  for(const [x,z] of treePoints){const root=treeSource.clone(true);root.visible=true;scene.add(root);root.position.set(x,0,z);root.rotation.y=rand()*6.28;root.scale.setScalar(.85+rand()*.4);const parts=meshes(root);parts.forEach(m=>m.material=m.material.clone());trees.push({root,meshes:parts});obstacle(x,z,.9,.9,4);}
  for(const x of [-14,14])for(const z of [-25,30,63]){box('raised-bed',x,.17,z,5,.34,7,stone);box('topiary',x,.55,z,4.7,.75,6.7,hedge);for(let i=0;i<14;i++){const f=new T.Mesh(new T.IcosahedronGeometry(.175,0));scene.add(f);f.position.set(x+(rand()-.5)*4.2,.95,z+(rand()-.5)*6);f.material=flower;}obstacle(x,z,5,7,1);}
  for(const x of [-7.2,7.2])for(const z of [-36,-12,26,49,70]){box('lamp-pole',x,1.9,z,.13,3.8,.13,metal);const globe=new T.Mesh(new T.SphereGeometry(.24,8,6));scene.add(globe);globe.position.set(x,3.8,z);const glow=pbr('lamp','#f3dea7');glow.emissive=new T.Color(.6,.43,.17);globe.material=glow;obstacle(x,z,.4,.4,4.1);}
  for(const side of [-1,1]) {
    box('gate-pier',side*6,2.5,77,1.4,5,1.4,stone);obstacle(side*6,77,1.4,1.4,5);
    box('gate-wall',side*37,.6,77,60,1.2,.5,stone);obstacle(side*37,77,60,.5,1.3);
    for(let x=8;x<66;x+=1.25)box('iron-fence',side*x,1.5,77,.07,1.6,.07,metal);
    box('fence-rail',side*37,2.05,77,60,.07,.07,metal);
  }
  const gate=sign('治 校 大 學',new T.Vector3(0,5.3,77),10,1.2);obstacle(0,77,11,.4,6,false,4.7);
  for(const x of [-10,10])for(const z of [-18,35]){box('bench-seat',x,.65,z,2.8,.15,.65,metal);box('bench-back',x,1.1,z+.3,2.8,.8,.12,stone);for(const dx of [-1,1])box('bench-leg',x+dx,.3,z,.12,.6,.5,metal);obstacle(x,z,2.8,.8,1.6);}
  const hero=await model('principal');hero.position.set(0,.08,65);hero.rotation.y=Math.PI;
  const limbs={};nodes(hero).forEach(n=>{if(['armL','armR','legL','legR','elbowL','elbowR','kneeL','kneeR'].includes(n.name))limbs[n.name]=n;});
  for(const b of buildings){const npc=hero.clone(true);scene.add(npc);npc.position.copy(b.npcPosition);npc.position.y=.08;npc.rotation.y=b.rotation;b.npc=npc;const label=sign(b.id==='admin'?'主任秘書':b.name+'院長',b.npcPosition.clone().add(new T.Vector3(0,2.7,0)),2.5,.36);billboards.push(label);}
  const semesterCrowds={education:[],management:[]},semesterSigns={};
  function updateSemester(e){
    const queue=Math.max(0,e.students-140-(e.reports.at(-1)?.plan.meal?80:0));
    for(const id of ['education','management']){
      const b=buildings.find(b=>b.id===id),people=semesterCrowds[id];
      const count=Math.min(8,id==='education'?Math.ceil(e.students/30):Math.ceil(queue/10));
      while(people.length<count){const n=people.length,npc=hero.clone(true);scene.add(npc);npc.scale.setScalar(.83);npc.rotation.y=b.rotation;
        nodes(npc).forEach(node=>{if(/arm|leg|knee|elbow/.test(node.name)){node.rotation.x=0;}});
        meshes(npc).forEach(m=>m.visible=true);people.push(npc);}
      people.forEach((npc,i)=>{npc.visible=i<count;npc.position.copy(local(b,-1.8-(i%2)*1.1,b.depth/2+5.8+Math.floor(i/2)*1.1));npc.position.y=.08;});
      if(semesterSigns[id])disposeSign(semesterSigns[id]);
      const text=id==='education'?`教室 ${e.rooms} 間 / 學生 ${e.students} 人 / 缺師 ${Math.max(0,Math.ceil(e.students/30)-e.teachers)}`:`用餐超額 ${queue} 人 / 人流示意`;
      const label=sign(text,local(b,-1.8,b.depth/2+5.5).add(new T.Vector3(0,3.4,0)),5,.6);billboards.push(label);semesterSigns[id]=label;
    }
  }

  // Materials shared by imported models must be isolated before character fading.
  const heroParts=meshes(hero);heroParts.forEach(m=>m.material=m.material.clone());
  const camera=new T.PerspectiveCamera(.92*180/Math.PI,1,.1,650);
  let yaw=0,pitch=.24,radius=10,actualRadius=10,drag=false,lastX=0,lastY=0,active=false,walkTime=0,paused=false,aerial=false;
  const orbit=new OrbitControls(camera,canvas);orbit.enabled=false;orbit.enableDamping=true;orbit.enablePan=false;orbit.minDistance=80;orbit.maxDistance=260;orbit.minPolarAngle=.2;orbit.maxPolarAngle=1.1;
  const markers=buildings.map((b,i)=>{const m=sign(String(i+1).padStart(2,'0')+' '+(b.short||b.name),new T.Vector3(b.x,b.floors*3.6+10,b.z),16,2.2);m.visible=false;m.userData.buildingId=b.id;billboards.push(m);return m;});
  function setAerial(value){aerial=value;clearKeys();orbit.enabled=value;markers.forEach(m=>m.visible=value);if(value){camera.position.set(110,130,150);orbit.target.set(0,0,0);orbit.update();}}
  const raycaster=new T.Raycaster();let aerialDown=null;
  canvas.addEventListener('pointerdown',e=>{if(aerial&&active)aerialDown=[e.clientX,e.clientY];});
  canvas.addEventListener('pointerup',e=>{if(!aerial||!active||!aerialDown)return;const down=aerialDown;aerialDown=null;if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hits=raycaster.intersectObjects([...buildings.map(b=>b.root),...markers],true);if(hits.length){let n=hits[0].object,b=buildings.find(b=>b.id===n.userData.buildingId);while(n&&!b){b=buildings.find(b=>b.root===n);n=n.parent;}if(b){setAerial(false);const p=b.arrival;hero.position.set(p.x,.08,p.z);yaw=b.rotation;actualRadius=radius;onProgress('已抵達'+b.name);}}});
  const keys={},focus=new T.Vector3(),direction=new T.Vector3();let fps=60,frames=0,elapsed=0,last=performance.now(),cpuFrameMs=0;
  canvas.addEventListener('pointerdown',e=>{if(!active||aerial)return;canvas.focus();drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-lastX)*.005;pitch=Math.max(.12,Math.min(1.12,pitch+(e.clientY-lastY)*.004));lastX=e.clientX;lastY=e.clientY;});
  const release=()=>drag=false;canvas.addEventListener('pointerup',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('wheel',e=>{if(!active||aerial)return;radius=Math.max(3.5,Math.min(18,radius+e.deltaY*.012));e.preventDefault();},{passive:false});
  document.addEventListener('keydown',e=>{if(!active||aerial||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyR','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){keys[e.code]=true;e.preventDefault();}});
  document.addEventListener('keyup',e=>delete keys[e.code]);
  function clearKeys(){Object.keys(keys).forEach(k=>delete keys[k]);drag=false;}
  window.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',clearKeys);
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}resize();window.addEventListener('resize',resize);
  function fade(m,opacity){m.material.transparent=opacity<1;m.material.opacity=opacity;m.material.depthWrite=opacity===1;}
  function animate(){const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(paused)return;const start=performance.now();
    if(active&&!aerial)yaw+=((keys.KeyQ?1:0)-(keys.KeyR?1:0))*2*dt;
    const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),side=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);let moving=false;
    if(active&&!aerial&&(forward||side)){const speed=(keys.ShiftLeft||keys.ShiftRight)?8:4.2,length=Math.hypot(forward,side),dx=(side*Math.cos(yaw)-forward*Math.sin(yaw))/length,dz=(-forward*Math.cos(yaw)-side*Math.sin(yaw))/length;const old=hero.position.clone();move(hero.position,dx*speed*dt,dz*speed*dt,boxes);moving=old.distanceToSquared(hero.position)>.000001;if(moving){const turn=Math.atan2(dx,dz)-hero.rotation.y;hero.rotation.y+=Math.atan2(Math.sin(turn),Math.cos(turn))*(1-Math.exp(-20*dt));walkTime+=dt*speed*2;}}
    const running=moving&&(keys.ShiftLeft||keys.ShiftRight);for(const [name,node] of Object.entries(limbs)){const swing=Math.sin(walkTime)*(name.endsWith('L')?1:-1);let target=0;if(name.startsWith('knee'))target=moving?Math.max(0,swing)*(running?1.05:.65):0;else if(name.startsWith('elbow'))target=moving?(running?-.9:-.25):-.08;else if(moving)target=swing*(running?.7:.45)*(name.startsWith('arm')?-1:1);node.rotation.x+=(target-node.rotation.x)*(1-Math.exp(-18*dt));}
    focus.copy(hero.position);focus.y+=1.65;direction.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
    let limit=radius;for(const b of boxes)limit=Math.min(limit,rayBox(focus,direction,b,radius));limit=Math.max(.45,limit-.15);actualRadius=limit<actualRadius?limit:actualRadius+(limit-actualRadius)*(1-Math.exp(-6*dt));if(aerial)orbit.update();else{camera.position.copy(focus).addScaledVector(direction,actualRadius);camera.lookAt(focus);}
    heroParts.forEach(m=>fade(m,!aerial&&actualRadius<1.2?.18:1));
    for(const t of trees){const offset=t.root.position.clone().add(new T.Vector3(0,5,0)).sub(focus),along=offset.dot(direction);const blocked=!aerial&&along>0&&along<actualRadius+3&&offset.addScaledVector(direction,-along).length()<4;t.meshes.forEach(m=>fade(m,blocked?.12:1));}
    jets.forEach((m,i)=>m.material.opacity=.65+.2*Math.sin(now*.003+i));billboards.forEach(m=>m.quaternion.copy(camera.quaternion));
    onTick({position:hero.position,moving,fps});renderer.render(scene,camera);cpuFrameMs=performance.now()-start;frames++;elapsed+=dt;if(elapsed>1){fps=frames/elapsed;frames=0;elapsed=0;}
  }
  await Promise.all(pendingTextures);renderer.setAnimationLoop(animate);
  return {renderer,scene,hero,camera,buildings,boxes,trees,limbs,updateSemester,setAerial,get viewMode(){return aerial?"aerial":"walk";},
    setActive(value){active=value;orbit.enabled=value&&aerial;if(!value)clearKeys();},
    setPaused(value){paused=value;clearKeys();last=performance.now();},
    teleport(x,z,heading=0){const safe=safePosition(x,z,boxes);hero.position.set(safe?x:0,.08,safe?z:65);yaw=heading;actualRadius=radius;clearKeys();return safe;},
    go(b){setAerial(false);this.teleport(b.arrival.x,b.arrival.z,b.rotation);},
    quality(low){renderer.setPixelRatio(low?.75:Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=!low;resize();},
    snapshot(){const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {semesterPeople:Object.fromEntries(Object.entries(semesterCrowds).map(([k,v])=>[k,v.filter(n=>n.visible).length])),engine:'Three.js '+T.REVISION,webgl:2,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',buildings:buildings.length,meshes:meshes(scene).length,vertices:meshes(scene).reduce((n,m)=>n+m.geometry.attributes.position.count,0),drawCalls:renderer.info.render.calls,cpuFrameMs,gpuFrameMs:null,fps,camera:camera.position.toArray(),yaw,pitch,radius,actualRadius,position:[hero.position.x,hero.position.z],viewMode:aerial?'aerial':'walk',fadedTrees:trees.filter(t=>t.meshes.some(m=>m.material.opacity<1)).length,paused};}
  };
}
