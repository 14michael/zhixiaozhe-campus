import {move,safePosition,rayBox} from './collision.js';
const B=window.BABYLON;
export async function createWorld(canvas,onProgress,onTick) {
  if(!B || !B.Engine.IsSupported)throw new Error('無法啟用 WebGL 3D。請開啟瀏覽器硬體加速後重試。');
  const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});
  engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.5));
  const scene=new B.Scene(engine);scene.useRightHandedSystem=true;
  scene.clearColor=new B.Color4(.72,.81,.83,1);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.0024;scene.fogColor=new B.Color3(.72,.81,.83);
  scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;scene.imageProcessingConfiguration.exposure=1.15;scene.imageProcessingConfiguration.contrast=1.12;
  const sky=new B.HemisphericLight('sky',new B.Vector3(0,1,0),scene);sky.intensity=.72;sky.groundColor=new B.Color3(.34,.35,.28);
  const sun=new B.DirectionalLight('late-afternoon-sun',new B.Vector3(-.6,-1,-.4),scene);sun.position.set(50,85,40);sun.intensity=2.1;sun.diffuse=new B.Color3(1,.91,.77);
  const shadows=new B.ShadowGenerator(2048,sun);shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=B.ShadowGenerator.QUALITY_MEDIUM;shadows.bias=.0005;shadows.normalBias=.04;sun.shadowMinZ=1;sun.shadowMaxZ=200;
  const instrumentation=new B.EngineInstrumentation(engine);instrumentation.captureGPUFrameTime=true;
  const sceneInstrumentation=new B.SceneInstrumentation(scene);sceneInstrumentation.captureFrameTime=true;sceneInstrumentation.captureRenderTime=true;
  const environmentData=Array.from({length:6},(_,face)=>{const data=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const c=face===2?[193,212,220]:face===3?[80,88,66]:[140+y*2,165+y,174];const i=(y*16+x)*4;data.set([...c,255],i);}return data;});
  const env=new B.RawCubeTexture(scene,environmentData,16,B.Engine.TEXTUREFORMAT_RGBA,B.Engine.TEXTURETYPE_UNSIGNED_BYTE,true,false,B.Texture.TRILINEAR_SAMPLINGMODE);env.coordinatesMode=B.Texture.CUBIC_MODE;scene.environmentTexture=env;scene.environmentIntensity=.55;
  const textures={};
  function texture(name,scale=1){const key=name+scale;if(!textures[key]){const t=new B.Texture('./assets/textures/'+name+'.png',scene);t.uScale=t.vScale=scale;textures[key]=t;}return textures[key];}
  const materialCache=new Map();
  function dress(root) {root.getChildMeshes().forEach(m=>{if(!m.material)return;const name=m.material.name;if(materialCache.has(name))m.material=materialCache.get(name);else{const mat=m.material;mat.allowShaderHotSwapping=false;mat.environmentIntensity=.55;if(name==='brick'){mat.albedoColor=B.Color3.White();mat.albedoTexture=texture('brick-albedo',.65);mat.bumpTexture=texture('brick-normal',.65);mat.bumpTexture.level=.45;}if(name==='stone'||name==='roof'){mat.albedoColor=B.Color3.White();mat.albedoTexture=texture(name+'-albedo',.6);}materialCache.set(name,mat);}m.receiveShadows=true;shadows.addShadowCaster(m);});}
  const materials={};
  function pbr(name,color,tex,scale=1){const m=new B.PBRMaterial(name,scene);m.albedoColor=B.Color3.FromHexString(color);m.metallic=0;m.roughness=.9;if(tex)m.albedoTexture=texture(tex,scale);materials[name]=m;return m;}
  const grass=pbr('lawn','#d2d8a7','grass-albedo',130),paving=pbr('paving','#ffffff','path-albedo',1),stone=pbr('landscape-stone','#b9b5a2'),metal=pbr('landscape-metal','#273b3a'),asphalt=pbr('asphalt','#606665'),flower=pbr('flowers','#ba8f98'),hedge=pbr('hedge','#415c36');
  function box(name,x,y,z,w,h,d,mat){const m=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=mat;m.receiveShadows=true;return m;}
  const ground=B.MeshBuilder.CreateGround('continuous-campus-ground',{width:520,height:520},scene);ground.material=grass;ground.receiveShadows=true;
  function path(x,z,w,d){const m=box('limestone-walkway',x,.025,z,w,.05,d,paving);const uv=m.getVerticesData(B.VertexBuffer.UVKind);for(let i=0;i<uv.length;i+=2){uv[i]*=w/3;uv[i+1]*=d/3;}m.setVerticesData(B.VertexBuffer.UVKind,uv);return m;}
  path(0,12,10,137);path(0,-39,64,10);path(0,12,64,11);path(0,51,64,10);path(-27,5,5,110);path(27,5,5,110);path(0,0,26,23);
  box('campus-road',0,.015,82,170,.03,8,asphalt);
  for(let x=-78;x<80;x+=10)box('road-mark',x,.04,82,4,.02,.16,stone);
  const boxes=[];
  function obstacle(x,z,w,d,y=20,walk=true,minY=0){const b={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY,maxY:y,walk};boxes.push(b);return b;}
  const buildings=await fetch('./assets/campus.json').then(r=>{if(!r.ok)throw new Error('校園配置載入失敗');return r.json()});
  let count=0;
  async function model(name){onProgress(`載入 3D 資產 ${++count}/10`);const r=await B.SceneLoader.ImportMeshAsync('','./assets/models/',name+'.glb',scene);const root=r.meshes[0];root.name=name;dress(root);return root;}
  function local(b,x,z){return new B.Vector3(b.x+Math.cos(b.rotation)*x+Math.sin(b.rotation)*z,0,b.z-Math.sin(b.rotation)*x+Math.cos(b.rotation)*z);}
  function sign(text,pos,width=7,height=1.1){const t=new B.DynamicTexture('sign-'+text,{width:1024,height:128},scene,false);const ctx=t.getContext();ctx.fillStyle='#223e38';ctx.fillRect(0,0,1024,128);ctx.strokeStyle='#c7b785';ctx.lineWidth=3;ctx.strokeRect(8,8,1008,112);ctx.fillStyle='#eee6c9';ctx.font='48px Microsoft JhengHei, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64);t.update();const m=new B.StandardMaterial('sign',scene);m.diffuseTexture=t;m.emissiveColor=new B.Color3(.25,.25,.22);m.specularColor=B.Color3.Black();m.backFaceCulling=false;const plane=B.MeshBuilder.CreatePlane('sign-'+text,{width,height},scene);plane.position.copyFrom(pos);plane.material=m;return plane;}
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
  for(let i=0;i<10;i++){const a=i*Math.PI/5,points=[];for(let j=0;j<=12;j++){const t=j/12;points.push(new B.Vector3(Math.cos(a)*t*3.3,2.55+2.1*t-3.8*t*t,Math.sin(a)*t*3.3));}const jet=B.MeshBuilder.CreateTube('water-jet',{path:points,radius:.032,tessellation:5},scene);jet.material=pbr('water-stream-'+i,'#b9dbd4');jet.material.alpha=.65;jets.push(jet);}
  const treeSource=await model('tree');treeSource.setEnabled(false);const trees=[];
  let seed=2301;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
  const treePoints=[];
  for(const x of [-20,20])for(const z of [-31,-16,28,42,65])treePoints.push([x,z]);
  for(const x of [-65,65])for(let z=-61;z<75;z+=16)treePoints.push([x,z]);
  for(let x=-48;x<=48;x+=16)treePoints.push([x,-73]);
  for(const [x,z] of treePoints){const root=treeSource.clone('tree-instance',null,false);root.setEnabled(true);root.position.set(x,0,z);root.rotation.y=rand()*6.28;root.scaling.setAll(.85+rand()*.4);const meshes=root.getChildMeshes();meshes.forEach(m=>shadows.addShadowCaster(m));trees.push({root,meshes});obstacle(x,z,.9,.9,4);}
  for(const x of [-14,14])for(const z of [-25,30,63]){box('raised-bed',x,.17,z,5,.34,7,stone);box('topiary',x,.55,z,4.7,.75,6.7,hedge);for(let i=0;i<14;i++){const f=B.MeshBuilder.CreateSphere('flower',{diameter:.35,segments:3},scene);f.position.set(x+(rand()-.5)*4.2,.95,z+(rand()-.5)*6);f.material=flower;}obstacle(x,z,5,7,1);}
  for(const x of [-7.2,7.2])for(const z of [-36,-12,26,49,70]){box('lamp-pole',x,1.9,z,.13,3.8,.13,metal);const globe=B.MeshBuilder.CreateSphere('lamp-globe',{diameter:.48,segments:8},scene);globe.position.set(x,3.8,z);const glow=pbr('lamp','#f3dea7');glow.emissiveColor=new B.Color3(.6,.43,.17);globe.material=glow;obstacle(x,z,.4,.4,4.1);}
  for(const side of [-1,1]) {
    box('gate-pier',side*6,2.5,77,1.4,5,1.4,stone);obstacle(side*6,77,1.4,1.4,5);
    box('gate-wall',side*37,.6,77,60,1.2,.5,stone);obstacle(side*37,77,60,.5,1.3);
    for(let x=8;x<66;x+=1.25)box('iron-fence',side*x,1.5,77,.07,1.6,.07,metal);
    box('fence-rail',side*37,2.05,77,60,.07,.07,metal);
  }
  const gate=sign('治 校 大 學',new B.Vector3(0,5.3,77),10,1.2);obstacle(0,77,11,.4,6,false,4.7);
  for(const x of [-10,10])for(const z of [-18,35]){box('bench-seat',x,.65,z,2.8,.15,.65,metal);box('bench-back',x,1.1,z+.3,2.8,.8,.12,stone);for(const dx of [-1,1])box('bench-leg',x+dx,.3,z,.12,.6,.5,metal);obstacle(x,z,2.8,.8,1.6);}
  const hero=await model('principal');hero.position.set(0,.08,65);hero.rotation.y=Math.PI;
  const limbs={};hero.getChildTransformNodes().forEach(n=>{if(['armL','armR','legL','legR','elbowL','elbowR','kneeL','kneeR'].includes(n.name))limbs[n.name]=n;});
  for(const b of buildings){const npc=hero.clone(b.npc,null,false);npc.position.copyFrom(b.npcPosition);npc.position.y=.08;npc.rotation.y=b.rotation;b.npc=npc;const label=sign(b.id==='admin'?'主任秘書':b.name+'院長',b.npcPosition.add(new B.Vector3(0,2.7,0)),2.5,.36);label.billboardMode=B.Mesh.BILLBOARDMODE_ALL;}
  const camera=new B.UniversalCamera('third-person',new B.Vector3(0,5.5,82),scene);camera.minZ=.1;camera.maxZ=650;camera.fov=.92;camera.inputs.clear();
  let yaw=0,pitch=.24,radius=10,actualRadius=10,drag=false,lastX=0,lastY=0,active=false,walkTime=0;
  const keys={};const focus=hero.position.add(new B.Vector3(0,1.65,0));
  canvas.addEventListener('pointerdown',e=>{if(!active)return;canvas.focus();drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-lastX)*.005;pitch=Math.max(.12,Math.min(1.12,pitch+(e.clientY-lastY)*.004));lastX=e.clientX;lastY=e.clientY;});
  const release=()=>drag=false;canvas.addEventListener('pointerup',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('wheel',e=>{if(!active)return;radius=Math.max(3.5,Math.min(18,radius+e.deltaY*.012));e.preventDefault();},{passive:false});
  document.addEventListener('keydown',e=>{if(!active || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyR','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){keys[e.code]=true;e.preventDefault();}});
  document.addEventListener('keyup',e=>delete keys[e.code]);
  function clearKeys(){Object.keys(keys).forEach(k=>delete keys[k]);drag=false;}
  window.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',clearKeys);
  scene.onBeforeRenderObservable.add(()=>{
    const dt=Math.min(.05,engine.getDeltaTime()/1000);
    if(active)yaw+=((keys.KeyQ?1:0)-(keys.KeyR?1:0))*2*dt;
    const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),side=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
    let moving=false;
    if(active&&(forward||side)){
      const speed=(keys.ShiftLeft||keys.ShiftRight)?8:4.2,length=Math.hypot(forward,side);
      const dx=(side*Math.cos(yaw)-forward*Math.sin(yaw))/length,dz=(-forward*Math.cos(yaw)-side*Math.sin(yaw))/length;
      const old=hero.position.clone();move(hero.position,dx*speed*dt,dz*speed*dt,boxes);moving=B.Vector3.DistanceSquared(old,hero.position)>.000001;
      if(moving){const turn=Math.atan2(dx,dz)-hero.rotation.y;hero.rotation.y+=Math.atan2(Math.sin(turn),Math.cos(turn))*(1-Math.exp(-20*dt));walkTime+=dt*speed*2;}
    }
    const running=moving&&(keys.ShiftLeft||keys.ShiftRight);
    for(const [name,node] of Object.entries(limbs)){
      node.rotationQuaternion=null;
      const swing=Math.sin(walkTime)*(name.endsWith('L')?1:-1);
      let target=0;
      if(name.startsWith('knee'))target=moving?Math.max(0,swing)*(running?1.05:.65):0;
      else if(name.startsWith('elbow'))target=moving?(running?-.9:-.25):-.08;
      else if(moving)target=swing*(running?.7:.45)*(name.startsWith('arm')?-1:1);
      node.rotation.x+=(target-node.rotation.x)*(1-Math.exp(-18*dt));
    }
    focus.copyFrom(hero.position).addInPlaceFromFloats(0,1.65,0);
    const direction=new B.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
    let limit=radius;for(const b of boxes)limit=Math.min(limit,rayBox(focus,direction,b,radius));
    limit=Math.max(.45,limit-.15);actualRadius=limit<actualRadius?limit:actualRadius+(limit-actualRadius)*(1-Math.exp(-6*dt));
    camera.position.copyFrom(focus).addInPlace(direction.scale(actualRadius));camera.setTarget(focus);
    hero.getChildMeshes().forEach(m=>m.visibility=actualRadius<1.2?.18:1);
    for(const t of trees){const offset=t.root.position.add(new B.Vector3(0,5,0)).subtract(focus),along=B.Vector3.Dot(offset,direction);const blocked=along>0&&along<actualRadius+3&&offset.subtract(direction.scale(along)).length()<4;t.meshes.forEach(m=>m.visibility=blocked?.12:1);}
    jets.forEach((m,i)=>m.visibility=.65+.2*Math.sin(performance.now()*.003+i));
    onTick({position:hero.position,moving,fps:engine.getFps()});
  });
  await scene.whenReadyAsync();engine.runRenderLoop(()=>scene.render());window.addEventListener('resize',()=>engine.resize());
  return {engine,scene,hero,camera,buildings,boxes,trees,limbs,
    setActive(value){active=value;if(!value)clearKeys();},
    teleport(x,z,heading=0){const safe=safePosition(x,z,boxes);hero.position.set(safe?x:0,.08,safe?z:65);yaw=heading;actualRadius=radius;clearKeys();return safe;},
    go(b){this.teleport(b.arrival.x,b.arrival.z,b.rotation);},
    quality(low){engine.setHardwareScalingLevel(low?1.8:Math.max(1,devicePixelRatio/1.5));scene.shadowsEnabled=!low;},
    snapshot(){const gl=engine._gl,ext=gl.getExtension('WEBGL_debug_renderer_info');return {engine:B.Engine.Version,webgl:engine.webGLVersion,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',buildings:buildings.length,meshes:scene.meshes.length,vertices:scene.getTotalVertices(),activeMeshes:scene.getActiveMeshes().length,drawCalls:sceneInstrumentation.drawCallsCounter.current,cpuFrameMs:sceneInstrumentation.frameTimeCounter.current,gpuFrameMs:instrumentation.gpuFrameTimeCounter.current/1e6,fps:engine.getFps(),camera:[camera.position.x,camera.position.y,camera.position.z],yaw,pitch,radius,actualRadius,position:[hero.position.x,hero.position.z],fadedTrees:trees.filter(t=>t.meshes.some(m=>m.visibility<1)).length};}
  };
}
