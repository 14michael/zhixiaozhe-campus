const $=id=>document.getElementById(id);
const steps=[
  ['踏出校長的第一步','按住 W A S D 或方向鍵，實際走滿 5 公尺。Shift 可奔跑，Q／R 可轉向。'],
  ['走到行政大樓報到','跟著方向指引前往；中央噴水池請沿兩側繞行。快速前往後仍須親自走近主任秘書，才算抵達。'],
  ['與主任秘書交談','靠近主任秘書按 E；若開啟的是大樓入口，請點「與主任秘書交談」。'],
  ['查看八項校務指標','點任務卡的「查看校務指標」，打開到任簡報。查看資料不會替你做決策。']
];
export function tutorialState(value){
  return {step:Number.isInteger(value?.step)&&value.step>=0&&value.step<=4?value.step:0,
    distance:Number.isFinite(value?.distance)?Math.max(0,Math.min(5,value.distance)):0,paused:value?.paused===true};
}
export function createTutorial({getState,world,editable,save,renderMission,showMetrics}){
  let previous=null,lastUI=0;
  const active=()=>editable()&&!getState().tutorial.paused&&getState().tutorial.step<4;
  function render(){
    const s=getState(),t=s?.tutorial;
    $('tutorial-toggle').disabled=!editable();
    $('tutorial').hidden=!active();
    $('mission').hidden=!s||active();
    $('tutorial-toggle').textContent=!t?'新手實作':t.step===4?'重練教學':t.paused?'繼續教學':'新手實作';
    if(!t||t.step===4)return;
    $('tutorial-title').textContent=steps[t.step][0];$('tutorial-hint').textContent=steps[t.step][1];
    $('tutorial-progress').value=t.step;$('tutorial-count').textContent=`${t.step} / 4 完成`;
    $('tutorial-metrics').hidden=t.step!==3;
    $('tutorial-checklist').replaceChildren(...steps.map(([title],i)=>{const li=document.createElement('li');li.textContent=`${i<t.step?'✓':i===t.step?'▶':'○'} ${title}`;if(i===t.step)li.setAttribute('aria-current','step');return li;}));
    $('tutorial-navigation').textContent=t.step===0?`已走 ${t.distance.toFixed(1)} / 5 公尺`:t.step===1?'正在定位行政大樓…':t.step===2?'主任秘書就在入口旁，按 E 互動':'點下方按鈕，閱讀到任簡報';
  }
  function complete(expected){
    if(!active()||getState().tutorial.step!==expected)return;
    const t=getState().tutorial;t.step++;save();renderMission();render();
    $('tutorial-feedback').textContent=t.step===4?'✓ 到任教學完成！已解鎖自由巡訪，接著選擇三項學院方案。':`✓ ${steps[expected][0]}完成！下一步：${steps[t.step][0]}`;
    $('tutorial-feedback').classList.remove('celebrate');void $('tutorial-feedback').offsetWidth;$('tutorial-feedback').classList.add('celebrate');
  }
  $('tutorial-toggle').onclick=()=>{if(!editable())return;const t=getState().tutorial;if(t.step===4){getState().tutorial=tutorialState();previous=null;}$('tutorial-feedback').textContent='';getState().tutorial.paused=false;save();render();$('game').focus();};
  $('tutorial-pause').onclick=()=>{if(!editable())return;getState().tutorial.paused=true;save();renderMission();render();$('game').focus();};
  $('tutorial-metrics').onclick=showMetrics;
  return {render,complete,
    tick(position,moving){
      const delta=previous?Math.hypot(position.x-previous[0],position.z-previous[1]):0;previous=[position.x,position.z];
      if(!active())return;
      const t=getState().tutorial,b=world.buildings.find(b=>b.id==='admin'),p=b.npcPosition,distance=Math.hypot(position.x-p.x,position.z-p.z);
      // Actual movement only: navigation jumps and blocked keys cannot award walking progress.
      if(moving&&delta>0&&delta<.6){if(t.step===0){t.distance=Math.min(5,t.distance+delta);if(t.distance>=5)complete(0);}else if(t.step===1&&distance<3.5)complete(1);}
      if(performance.now()-lastUI<150)return;lastUI=performance.now();
      if(t.step===0)$('tutorial-navigation').textContent=`已走 ${t.distance.toFixed(1)} / 5 公尺`;
      if(t.step===1){const yaw=world.snapshot().yaw,angle=Math.atan2(p.x-position.x,position.z-p.z)+yaw;
        $('tutorial-navigation').replaceChildren();const arrow=document.createElement('span');arrow.textContent='↑';arrow.className='tutorial-arrow';arrow.style.transform=`rotate(${angle}rad)`;arrow.setAttribute('aria-hidden','true');$('tutorial-navigation').append(arrow,` 行政大樓 · ${Math.ceil(distance)} 公尺`);}
    }
  };
}
