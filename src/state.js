export const BASE={'學校聲望':73,'教職員士氣':64,'學術研究品質':76,'行政效率':71,'財務穩健':70,'校園安全':81,'招生競爭力':62,'改革支持度':62};
export const DELTAS={A:['行政效率',1],B:['行政效率',-2],C:['改革支持度',2],D:['校園安全',1],E:['學校聲望',1]};
import {tutorialState} from './tutorial.js';
import {newSemester,loadSemester} from './semester.js';
export const fresh=()=>({version:'2.3',metrics:{...BASE},decision:null,position:[0,65],visited:[],initiatives:{},tutorial:tutorialState(),semester:newSemester(),classroom:{visits:0,lastTerm:null},opinion:'',seed:2301});
import {selections} from './missions.js';
export function load(user) {
  const raw=localStorage.getItem('zhixiaozhe-v2-'+user);
  if(!raw)return fresh();
  let s;
  try{s=JSON.parse(raw)}catch{throw new Error('既有存檔無法讀取，已保留原資料。請改用另一個訪客代號。')}
  if(!s || typeof s!=='object' || !s.metrics || !Object.keys(BASE).every(k=>Number.isFinite(s.metrics[k])&&s.metrics[k]>=0&&s.metrics[k]<=100) || (s.decision!==null && !Object.hasOwn(DELTAS,s.decision)))throw new Error('既有存檔格式不完整，已保留原資料。請改用另一個訪客代號。');
  return {...fresh(),...s,classroom:{visits:Number.isSafeInteger(s.classroom?.visits)&&s.classroom.visits>=0?s.classroom.visits:0,lastTerm:Number.isInteger(s.classroom?.lastTerm)&&s.classroom.lastTerm>=1?s.classroom.lastTerm:null},tutorial:tutorialState(s.tutorial),semester:loadSemester(s.semester),initiatives:Object.fromEntries(selections(s)),version:'2.3',position:Array.isArray(s.position)&&s.position.length===2&&s.position.every(Number.isFinite)?s.position:[0,73],visited:Array.isArray(s.visited)?s.visited.filter(v=>typeof v==='string'):[]};
}
export function decide(state,choice,opinion='') {
  if(state.decision || !Object.hasOwn(DELTAS,choice))return false;
  if(choice==='E'&&!opinion.trim())return false;
  const [key,n]=DELTAS[choice];state.metrics[key]=Math.max(0,Math.min(100,state.metrics[key]+n));
  state.decision=choice;state.opinion=choice==='E'?opinion.trim().slice(0,1000):'';state.decidedAt=new Date().toISOString();return true;
}
