import {createWorld} from './world.js';
import {BASE,DELTAS,fresh,load,decide} from './state.js';
const $=id=>document.getElementById(id);
let world,state,user='',nearest=null,lastSave=0,dirty=false,storageFailed=false;
const notify=text=>$('status').textContent=text;
const editable=()=>!!state&&$('mode').value==='public';
function save() {
  if(!state || !user)return false;
  state.position=[world.hero.position.x,world.hero.position.z];
  try{localStorage.setItem('zhixiaozhe-v2-'+user,JSON.stringify(state));dirty=false;storageFailed=false;lastSave=performance.now();notify('進度已儲存');return true;}
  catch{storageFailed=true;notify('存檔失敗：瀏覽器儲存空間不足或被封鎖');return false;}
}
function renderMetrics(){
  $('metrics').replaceChildren();
  for(const [name,value] of Object.entries(state?.metrics||BASE)){
    const div=document.createElement('div');div.className='metric';div.dataset.metric=name;
    div.innerHTML='<div class="metric-row"><span></span><b></b></div><div class="track"><i></i></div>';
    div.querySelector('span').textContent=name;div.querySelector('b').textContent=value;div.querySelector('i').style.width=value+'%';$('metrics').append(div);
  }
}
function openDialog(title,kicker,talk){
  world?.setActive(false);$('dialog-title').textContent=title;$('dialog-kicker').textContent=kicker;$('talk').textContent=talk;$('dialog-content').replaceChildren();if(!$('dialog').open)$('dialog').showModal();
}
function closeDialog(){ $('dialog').close(); }
$('close-dialog').onclick=closeDialog;
$('dialog').addEventListener('close',()=>{world?.setActive(editable());$('game').focus();});
function button(text,fn,parent=$('dialog-content')){const b=document.createElement('button');b.textContent=text;b.className='choice';b.onclick=fn;parent.append(b);return b;}
function paragraph(text,cls=''){const p=document.createElement('p');p.textContent=text;p.className=cls;$('dialog-content').append(p);return p;}
function eventDialog(){
  openDialog('EVT-009｜工程追加預算','GOVERNANCE / 玩家決策','原預算 12,000 萬元，估計需求 15,600 萬元，差額 3,600 萬元；追加核定仍為 0。校長須決定如何回覆與安排後續查證。');
  paragraph('【D級｜遊戲情境】沿用 V2.2 示範規則；指標變動為遊戲設計，不代表法規判斷、核定追加或真實校務績效。','note');
  if(state.decision){
    paragraph('已記錄決策 '+state.decision,'delta');if(state.opinion)paragraph('自訂意見：'+state.opinion);
    const [k,n]=DELTAS[state.decision];paragraph(`${k} ${n>0?'+':''}${n}；目前 ${state.metrics[k]}。追加核定仍為 0。`);
    paragraph(storageFailed?'目前未成功寫入瀏覽器存檔。':'此決策已保存。重複開啟不會再次加減指標。');return;
  }
  const labels={A:'準時回覆已查證事實',B:'申請延長期限（未必核准）',C:'準時回覆並附補件責任與期限',D:'緊急跨處審查後回覆',E:'自訂處理意見'};
  for(const key of ['A','B','C','D']){
    const b=button(`${key}　${labels[key]}`,()=>applyDecision(key));b.dataset.choice=key;b.disabled=!editable();
    const [metric,n]=DELTAS[key],small=document.createElement('small');small.textContent=`遊戲效果：${metric} ${n>0?'+':''}${n}`;b.append(small);
  }
  const input=document.createElement('textarea');input.id='opinion';input.maxLength=1000;input.placeholder='E｜輸入你的處理意見（必填，最多 1,000 字）';input.setAttribute('aria-label','自訂處理意見');input.disabled=!editable();$('dialog-content').append(input);
  const custom=button('E　保存自訂處理意見',()=>applyDecision('E',input.value));custom.dataset.choice='E';custom.disabled=!editable();
  paragraph('決策後不能直接覆選；如需重新體驗，可重設此訪客進度。','note');
}
function applyDecision(choice,opinion='') {
  if(!editable()||state.decision)return;
  if(!decide(state,choice,opinion)){paragraph('請先輸入自訂處理意見。','error');return;}
  save();renderMetrics();eventDialog();
}
function interact(){
  if(!state||!nearest||$('mode').value==='closed')return;
  const b=nearest.building;
  if(editable()&&!state.visited.includes(b.id)){state.visited.push(b.id);save();}
  openDialog(nearest.kind==='npc'?(b.id==='admin'?'主任秘書':b.name+'院長'):b.name+'｜互動入口',b.id==='admin'?'CAMPUS GOVERNANCE':'COLLEGE / '+b.id.toUpperCase(),`林校長，歡迎來到${b.name}。本次討論：${b.topic}。`);
  for(const point of b.points){const s=document.createElement('span');s.className='badge';s.textContent=point;$('dialog-content').append(s);}
  if(b.id==='admin')button('開啟 EVT-009 校務事件',eventDialog);
  else paragraph('本次來訪已列入校園探索紀錄。學院任務為示範內容；本版提供入口對話，尚未開放室內探索。','note');
}
$('interact').onclick=interact;
document.addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat&&!$('dialog').open&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))interact();});
function tick({position,fps}) {
  $('fps').textContent=Math.round(fps)+' FPS';
  if(!state)return;
  const current=[position.x,position.z];
  if(editable()&&Math.hypot(current[0]-state.position[0],current[1]-state.position[1])>.001)dirty=true;
  if(dirty&&performance.now()-lastSave>1200)save();
  let candidate=null,distance=Infinity,area=null,areaDistance=Infinity;
  for(const b of world.buildings){
    const dist=Math.hypot(position.x-b.x,position.z-b.z);if(dist<areaDistance){areaDistance=dist;area=b;}
    for(const [kind,p] of [['npc',b.npcPosition],['entrance',b.entrance]]){const d=Math.hypot(position.x-p.x,position.z-p.z);if(d<3.5&&d<distance){distance=d;candidate={building:b,kind};}}
  }
  nearest=candidate;$('where').textContent=areaDistance<26?area.name:position.z>68?'校門入口':Math.abs(position.z)<13?'中央噴水池':'中央林蔭步道';
  $('interaction').hidden=!nearest||$('dialog').open||$('mode').value==='closed';
  if(nearest)$('prompt').textContent=nearest.kind==='npc'?'與'+(nearest.building.id==='admin'?'主任秘書':nearest.building.name+'院長')+'交談':nearest.building.name+'入口';
}
function enter(){
  if(!world)return;
  if($('mode').value==='closed'){$('err').textContent='此瀏覽器展示已關閉，請先切換為公開體驗或唯讀展示。';return;}
  const id=$('visitor').value.trim().slice(0,40);if(!id){$('err').textContent='請輸入訪客代號';return;}
  try{const loaded=load(id);state=loaded;user=id;const safe=world.teleport(...state.position);$('login').style.display='none';world.setActive(editable());renderMetrics();if(editable())save();if(!safe)notify('舊位置位於新建築範圍，已移至校門');$('game').focus();}
  catch(e){$('err').textContent=e.message;}
}
$('enter').onclick=enter;$('visitor').addEventListener('keydown',e=>{if(e.key==='Enter')enter();});
$('menu-toggle').onclick=()=>{$('overview').hidden=!$('overview').hidden;};
$('quality').onchange=()=>world?.quality($('quality').value==='low');
$('help').onclick=()=>{openDialog('校園操作說明','HOW TO EXPLORE','WASD 依視角方向移動，Shift 奔跑。滑鼠在場景拖曳旋轉視角，滾輪調整距離。');paragraph('靠近院長或建築入口按 E 開啟對話。由右側導覽可快速抵達七棟建築；行政大樓主任秘書提供 EVT-009 決策。');paragraph('移動每約 1.2 秒儲存一次，決策及對話立即儲存；重新整理後輸入相同代號可繼續。儲存範圍限相同網址與此瀏覽器。');};
$('mode').onchange=()=>{
  if(state&&dirty)save();world?.setActive(editable()&&!$('dialog').open);
  if($('dialog').open)closeDialog();
  if($('mode').value==='closed'){$('login').style.display='flex';$('err').textContent='此瀏覽器展示已關閉';if(!$('reopen')){const b=document.createElement('button');b.id='reopen';b.textContent='重新開啟本機展示';b.onclick=()=>{$('mode').value='public';$('mode').dispatchEvent(new Event('change'));b.remove();};$('err').after(b);}}
  else{$('err').textContent='';if(state)$('login').style.display='none';}
  notify($('mode').value==='public'?'公開體驗':$('mode').value==='view'?'唯讀展示：不可移動、決策或重設':'此瀏覽器展示已關閉');
};
$('reset').onclick=()=>{if(!editable())return;openDialog('重設此訪客進度','RESET PROGRESS','此操作會清除目前訪客的決策、指標與探索紀錄。');button('確認重設',()=>{state=fresh();world.teleport(...state.position);save();renderMetrics();closeDialog();});button('取消',closeDialog);};
window.addEventListener('pagehide',()=>{if(editable())save();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&editable())save();});
renderMetrics();
try {
  world=await createWorld($('game'),notify,tick);
  for(const [i,b] of world.buildings.entries()){
    const btn=document.createElement('button');btn.dataset.go=b.id;btn.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span>`;btn.append(document.createTextNode(b.short||b.name));btn.onclick=()=>{if(!editable()){notify('請先進入公開體驗');return;}world.go(b);save();$('game').focus();};$('buildings').append(btn);
  }
  $('enter').disabled=false;$('enter').textContent='進入校園 →';notify('3D 校園已就緒');
  // Read-only diagnostics are available in production; movement injection only on explicit local test URL.
  window.campus={snapshot:()=>({...world.snapshot(),state:state?JSON.parse(JSON.stringify(state)):null,nearest:nearest?{id:nearest.building.id,kind:nearest.kind}:null,storageFailed})};
  if(new URLSearchParams(location.search).has('test')&&['localhost','127.0.0.1'].includes(location.hostname))window.campus.test={world,teleport:(x,z,yaw=0)=>world.teleport(x,z,yaw)};
}catch(e){console.error(e);$('err').textContent='3D 校園載入失敗：'+e.message+'。請使用 HTTP 網址開啟，確認 vendor 與 assets 資料夾完整後重新整理。';$('enter').textContent='無法進入校園';notify('3D 載入失敗');}
