// D級：可驗算的虛構遊戲規則，非實際學費、薪資或教育法定標準。
export const RULES={seats:40,load:30,tuition:20000,salary:300000,maintenance:50000,room:400000,recruit:50000,meal:120000,dining:140};
export const defaultPlan=()=>({admit:40,hire:0,rooms:0,aid:0,meal:false});
export const newSemester=()=>({term:1,cash:3000000,students:120,teachers:3,rooms:4,plan:defaultPlan(),visits:[],reports:[]});
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export function validPlan(p){return !!p&&integer(p.admit,0,80)&&integer(p.hire,0,6)&&integer(p.rooms,0,2)&&[0,5000,10000].includes(p.aid)&&typeof p.meal==='boolean';}
export const termName=n=>`第 ${Math.ceil(n/2)} 學年${n%2?'上':'下'}學期`;
export function forecast(e){
  const p=e.plan,rooms=e.rooms+p.rooms,teachers=e.teachers+p.hire,capacity=rooms*RULES.seats;
  const admitted=Math.min(p.admit,Math.max(0,capacity-e.students)),students=e.students+admitted;
  const income=students*RULES.tuition,salary=teachers*RULES.salary,maintenance=rooms*RULES.maintenance;
  const aid=admitted*p.aid,investment=p.rooms*RULES.room,recruit=p.hire*RULES.recruit,meal=p.meal?RULES.meal:0;
  const expenses=salary+maintenance+aid+investment+recruit+meal,closing=e.cash+income-expenses;
  const shortage=Math.max(0,Math.ceil(students/RULES.load)-teachers),queue=Math.max(0,students-(RULES.dining+(p.meal?80:0)));
  const teaching=Math.min(100,Math.round(teachers*RULES.load/students*100)),satisfaction=Math.max(0,Math.min(100,85-shortage*8-Math.ceil(queue/10)*3+(aid>0?5:0)));
  return {admitted,students,teachers,rooms,capacity,income,salary,maintenance,aid,investment,recruit,meal,expenses,closing,shortage,queue,teaching,satisfaction};
}
export function loadSemester(value){
  if(value===undefined)return newSemester();
  const e=value;
  if(!e||!integer(e.term,1,1000)||!integer(e.cash,0,1e12)||!integer(e.rooms,4,20)||!integer(e.students,120,e.rooms*40)||!integer(e.teachers,3,40)||!validPlan(e.plan)||e.rooms+e.plan.rooms>20||e.teachers+e.plan.hire>40||!Array.isArray(e.visits)||e.visits.some(v=>!['education','management'].includes(v))||!Array.isArray(e.reports)||e.reports.length>12)throw new Error('學期經營存檔格式錯誤，已保留原資料。請改用另一個訪客代號。');
  for(const r of e.reports){
    if(!r||!integer(r.term,1,e.term-1)||!integer(r.cash,0,1e12)||!integer(r.rooms,4,20)||!integer(r.students,120,r.rooms*40)||!integer(r.teachers,3,40)||!validPlan(r.plan)||!r.result||Object.entries(forecast(r)).some(([k,v])=>r.result[k]!==v))throw new Error('學期結算紀錄無法驗算，已保留原資料。');
  }
  return structuredClone(e);
}
export function settle(e,expectedTerm){
  if(e.term!==expectedTerm)return {error:'本學期已結算，請重新開啟經營面板。'};
  if(!e.visits.includes('education')||!e.visits.includes('management'))return {error:'請先到教育學院與管理學院查看本學期巡校事項。'};
  if(!validPlan(e.plan))return {error:'計畫格式不正確，請重新編列。'};
  const result=forecast(e);
  if(result.closing<0)return {error:'期末資金不足，請調整計畫後再結算。'};
  if(e.term>=1000||result.closing>1e12||result.rooms>20||result.teachers>40)return {error:'已達本試玩版經營上限，請調整計畫或重設遊戲。'};
  const report={term:e.term,cash:e.cash,students:e.students,teachers:e.teachers,rooms:e.rooms,plan:{...e.plan},result};
  return {value:{term:e.term+1,cash:result.closing,students:result.students,teachers:result.teachers,rooms:result.rooms,plan:defaultPlan(),visits:[],reports:[...e.reports,report].slice(-12)},report};
}
