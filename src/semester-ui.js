import {RULES,forecast,settle,termName,validPlan} from './semester.js';
const $=id=>document.getElementById(id),money=n=>n.toLocaleString('zh-TW')+' 元';
export function createSemesterUI({getState,editable,save,world,openDialog,closeDialog,button,paragraph,notify}){
  const current=()=>getState()?.semester;
  function refresh(){
    const e=current();$('semester-open').disabled=!getState();
    $('semester-summary').textContent=e?`${termName(e.term)} · ${e.students} 人 · 資金 ${money(e.cash)}`:'登入後開始經營';
    if(e)world.updateSemester(e);
  }
  function commit(value){
    if(!editable())return false;
    const old=current();getState().semester=value;
    if(!save()){getState().semester=old;notify('學期變更未保存，已撤回；請釋出瀏覽器儲存空間後重試。');return false;}
    refresh();return true;
  }
  function table(e,r,parent=$('dialog-content')){
    const rows=[['期初資金',e.cash],['學雜費收入',r.income],['教師薪資',-r.salary],['教室維護',-r.maintenance],['新生獎助學金',-r.aid],['新增教室投入',-r.investment],['教師招募費',-r.recruit],['分流用餐服務',-r.meal],['支出合計',-r.expenses],['期末資金',r.closing]];
    const t=document.createElement('table');t.className='semester-ledger';const caption=t.createCaption();caption.textContent='本學期收支明細（遊戲幣／元）';
    for(const [name,n] of rows){const row=t.insertRow(),th=document.createElement('th');th.scope='row';th.textContent=name;row.append(th);row.insertCell().textContent=money(n);}parent.append(t);
  }
  function details(e,r){
    paragraph(`本期錄取 ${r.admitted} / 申請 ${e.plan.admit} 人；結算後 ${r.students} / ${r.capacity} 席，教師 ${r.teachers} 人。`);
    paragraph(`教學供給 ${r.teaching} / 100 · 學生滿意度 ${r.satisfaction} / 100 · 尚缺教師 ${r.shortage} 人 · 用餐超出服務容量 ${r.queue} 人。`,r.shortage||r.queue?'error':'delta');
    if(r.admitted<e.plan.admit)paragraph('教室容量不足，超出名額不錄取；也不收取其學費或發放獎助學金。','note');
    table(e,r);
  }
  function showReport(report){
    openDialog(`${termName(report.term)}｜結算完成`,'學期成果 / 已保存','本次結算已記錄，可回看明細；重複查看不會再收費。');
    details(report,report.result);paragraph('已進入下一學期。到教育學院看教學人流，到管理學院看用餐分流；現場人物僅為人數示意。');
    button('安排下一學期',open);button('回校園巡查',closeDialog);
  }
  function preview(){
    if(!editable())return;
    const e=structuredClone(current()),r=forecast(e);
    openDialog(`${termName(e.term)}｜確認結算`,'結算前檢核','本頁尚未扣款。請核對收入、支出與資源缺口，再確認推進一學期。');details(e,r);
    const missing=['education','management'].filter(id=>!e.visits.includes(id));
    if(missing.length)paragraph('尚未完成教育學院／管理學院的本學期巡查。','error');
    if(r.closing<0)paragraph('期末資金將為負數，禁止結算。','error');
    const confirm=button('確認結算並推進一學期',()=>{
      if(!editable())return;
      if(JSON.stringify(current())!==JSON.stringify(e)){paragraph('計畫已變動，請返回重新預覽。','error');return;}
      const result=settle(current(),e.term);if(result.error){paragraph(result.error,'error');return;}
      confirm.disabled=true;
      if(commit(result.value))showReport(result.report);else{paragraph('存檔失敗，結算已撤回，沒有扣款或推進學期。','error');confirm.disabled=false;}
    });confirm.id='semester-confirm';confirm.disabled=missing.length>0||r.closing<0;
    button('返回調整計畫',open);
  }
  function open(){
    const e=current();if(!e)return;
    openDialog(`${termName(e.term)}｜校務經營`,'第二章 / 經營一個學期','先巡校，再安排招生與資源，最後預覽收支並結算。所有計畫都在確認結算時生效。');
    const stats=document.createElement('div');stats.className='semester-stats';
    for(const [name,value] of [['可用資金',money(e.cash)],['在校學生',`${e.students} / ${e.rooms*40} 席`],['現有教師',`${e.teachers} 人`],['現有教室',`${e.rooms} 間`]]){const item=document.createElement('div');item.textContent=name;const strong=document.createElement('strong');strong.textContent=value;item.append(strong);stats.append(item);}$('dialog-content').append(stats);
    for(const [id,name] of [['education','教育學院：師資與容量'],['management','管理學院：用餐人流']]){
      const b=button(`${e.visits.includes(id)?'✓ 已巡查':'○ 待巡查'}｜前往${name}`,()=>{if(!editable())return;closeDialog();world.go(world.buildings.find(b=>b.id===id));save();notify('已到入口，按 E 並查看「本學期巡校事項」。');});b.dataset.semesterGo=id;b.disabled=!editable();
    }
    const form=document.createElement('form');form.id='semester-plan';
    const fields=[['admit','本期申請錄取人數',80,10,e.plan.admit],['hire','本期增聘教師',Math.min(6,40-e.teachers),1,e.plan.hire],['rooms','本期增加教室',Math.min(2,20-e.rooms),1,e.plan.rooms]];
    for(const [key,title,max,step,value] of fields){const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');Object.assign(input,{type:'number',name:key,id:'plan-'+key,min:0,max,step,value,required:true,disabled:!editable()});label.append(input);form.append(label);}
    const aidLabel=document.createElement('label');aidLabel.textContent='每名新生獎助學金';const aid=document.createElement('select');aid.name='aid';aid.id='plan-aid';aid.disabled=!editable();for(const n of [0,5000,10000]){const opt=document.createElement('option');opt.value=n;opt.textContent=money(n);aid.append(opt);}aid.value=e.plan.aid;aidLabel.append(aid);form.append(aidLabel);
    const mealLabel=document.createElement('label');mealLabel.textContent='本期分流用餐（12 萬元，增加 80 人服務容量）';const meal=document.createElement('input');Object.assign(meal,{type:'checkbox',name:'meal',id:'plan-meal',checked:e.plan.meal,disabled:!editable()});mealLabel.append(meal);form.append(mealLabel);
    const message=document.createElement('p');message.id='plan-message';message.setAttribute('role','status');
    const result=document.createElement('div');result.id='semester-estimate';
    const read=()=>({admit:Number(form.elements.admit.value),hire:Number(form.elements.hire.value),rooms:Number(form.elements.rooms.value),aid:Number(aid.value),meal:meal.checked});
    function estimate(){result.replaceChildren();const p=read();if(!form.checkValidity()||!validPlan(p)){result.textContent='請輸入範圍內的整數計畫。';return;}const r=forecast({...e,plan:p});result.textContent=`預估：錄取 ${r.admitted} 人、期末資金 ${money(r.closing)}、尚缺教師 ${r.shortage} 人、用餐超額 ${r.queue} 人。`;}
    form.addEventListener('input',estimate);form.addEventListener('change',estimate);
    const submit=document.createElement('button');submit.type='submit';submit.id='semester-save-plan';submit.textContent='保存本期計畫';submit.disabled=!editable();form.append(result,submit,message);
    form.onsubmit=event=>{event.preventDefault();if(!editable()||!form.reportValidity()||!validPlan(read()))return;const value={...current(),plan:read()};if(commit(value)){open();$('plan-message').textContent='計畫已保存，尚未扣款。';}else message.textContent='存檔失敗，計畫未變更。';};
    $('dialog-content').append(form);estimate();
    paragraph('請先保存計畫再預覽結算。未保存的表單調整不會生效。','note');
    const pre=button('預覽本期結算',preview);pre.id='semester-preview';pre.disabled=!editable();
    const changed=()=>{pre.disabled=!editable()||JSON.stringify(read())!==JSON.stringify(current().plan);message.textContent=pre.disabled&&editable()?'有未保存調整，請先保存本期計畫。':'';};
    form.addEventListener('input',changed);form.addEventListener('change',changed);
    if(e.reports.length){const report=e.reports.at(-1);button('查看上期結算',()=>showReport(report));}
    const rule=document.createElement('details');const summary=document.createElement('summary');summary.textContent='【D級】遊戲規則與計算公式';rule.append(summary);const p=document.createElement('p');p.textContent=`每間教室 ${RULES.seats} 席；每名教師服務 ${RULES.load} 人。每生每期收入 ${money(RULES.tuition)}；每師每期薪資 ${money(RULES.salary)}；每室維護 ${money(RULES.maintenance)}；每間新增教室 ${money(RULES.room)}；每名教師招募 ${money(RULES.recruit)}。獎助學金＝實際錄取新生×每生金額。期末資金＝期初＋學費－薪資－維護－獎助學金－教室投入－招募－用餐服務。教學供給＝min(100,四捨五入(教師×30÷學生×100))；滿意度＝限制於0～100的(85－缺師×8－向上取整(用餐超額÷10)×3＋實際發放獎助學金時5分)。本版未模擬畢業、退學、物價或真實法定員額。學期分數獨立於原八項校務指標。`;rule.append(p);$('dialog-content').append(rule);
  }
  function patrol(id){
    const e=current();if(!e||!['education','management'].includes(id))return;
    if(editable()&&!e.visits.includes(id))commit({...e,visits:[...e.visits,id]});
    const r=forecast(current());
    openDialog(id==='education'?'教學現場｜巡校紀錄':'用餐人流｜巡校紀錄','本學期 / 現況與計畫','巡查只記錄現況，不會自動聘任、擴充教室或扣款。');
    if(id==='education')paragraph(`現有 ${e.students} 名學生、${e.teachers} 名教師、${e.rooms*40} 席。按已保存計畫，結算後 ${r.students} 人、${r.capacity} 席，仍缺 ${r.shortage} 名教師。請比較招生與師資配置。`);
    else paragraph(`基本用餐服務容量每期 140 人。已保存計畫的學生數 ${r.students} 人；${e.plan.meal?'已規劃':'未規劃'}分流服務，預計超額 ${r.queue} 人。入口排隊人數為示意，非逐名學生模擬。`);
    if(!current().visits.includes(id))paragraph('本次未記錄巡查：目前為唯讀或存檔失敗。','error');
    button('調整本學期計畫',open);button('繼續巡校',closeDialog);
  }
  $('semester-open').onclick=open;
  return {open,refresh,patrol};
}
