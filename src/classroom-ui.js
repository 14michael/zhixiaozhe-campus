export function createClassroomUI({getState,editable,save,world,closeDialog,notify}){
  const room=document.createElement('dialog');room.id='classroom-room';room.setAttribute('aria-label','教育學院教室');
  const back=document.createElement('button');back.textContent='← 返回校園';back.id='classroom-return';
  const frame=document.createElement('iframe');frame.title='教育學院可操作教室';room.append(back,frame);document.body.append(room);
  let recorded=false;
  const exit=()=>{if(room.open)room.close();};back.onclick=exit;
  room.addEventListener('close',()=>{frame.src='about:blank';world.setPaused(false);world.setActive(editable());document.getElementById('game').focus();});
  addEventListener('message',e=>{
    if(e.source!==frame.contentWindow||e.origin!==location.origin||e.data?.type!=='campus-classroom-complete'||!room.open||!editable())return;
    if(recorded){frame.contentWindow.postMessage({type:'campus-classroom-save',ok:true},location.origin);return;}
    const s=getState(),previous=s.classroom;
    s.classroom={visits:(previous?.visits||0)+1,lastTerm:s.semester.term};
    const ok=save();if(ok){recorded=true;notify('教室巡課已保存');}else s.classroom=previous;
    frame.contentWindow.postMessage({type:'campus-classroom-save',ok},location.origin);
  });
  return {exit,open(){if(!editable())return;closeDialog();world.setActive(false);world.setPaused(true);recorded=false;frame.src='./classroom/index.html';room.showModal();},get active(){return room.open;}};
}
