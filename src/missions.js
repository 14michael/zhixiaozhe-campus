export const CASES={
  education:{title:'新學期，老師需要什麼？',story:'院長收到兩種聲音：新進教師想有人帶，資深教師希望有時間試新教法。今天只能支持一項。',options:[{label:'建立導師陪伴制度',effect:[8,3,-3],result:'新進教師有了固定求助對象，但資深教師必須分出時間。'},{label:'開放教學實驗時段',effect:[-2,10,-2],result:'新課程有機會落地，短期排課協調也增加了。'}]},
  science:{title:'實驗室的兩張申請單',story:'老舊設備仍能使用，但學生排隊等實驗。院長請你決定優先方向。',options:[{label:'先做設備安全盤點',effect:[5,2,3],result:'風險清單更清楚，研究速度暫時不會明顯提升。'},{label:'延長共享實驗時段',effect:[-3,10,-5],result:'學生能完成更多實驗，值班人力也更吃緊。'}]},
  humanities:{title:'圖書館熄燈之後',story:'學生希望圖書館晚一點關，館員則希望保留整理與休息時間。',options:[{label:'試辦晚間自習區',effect:[7,5,-6],result:'夜讀學生有了空間，維護與值勤負擔增加。'},{label:'先改善館藏預約服務',effect:[2,5,4],result:'找書更省時間，但晚間空間需求仍未解決。'}]},
  management:{title:'一筆有限的校務資源',story:'院長想辦大型交流活動，也有人建議先把現有資源整理清楚。',options:[{label:'辦跨院交流工作坊',effect:[6,6,-5],result:'跨院團隊開始互相認識，籌備佔用了行政時間。'},{label:'盤點閒置空間與設備',effect:[-2,2,10],result:'可共用資源浮上檯面，盤點期間需要各單位配合。'}]},
  arts:{title:'廣場應該留給誰？',story:'學生想在中央廣場展演，附近教室擔心噪音干擾。',options:[{label:'安排有時段限制的展演',effect:[10,2,-4],result:'校園多了表演與觀眾，也需要現場協調噪音與人流。'},{label:'先做小型室內策展',effect:[4,6,-2],result:'作品有了展出機會，參與規模較小但容易管理。'}]},
  informatics:{title:'數位校園的第一步',story:'學生抱怨借用設備流程繁瑣；資訊團隊則提醒，資料權限也需要整理。',options:[{label:'簡化設備借用流程',effect:[7,3,2],result:'學生少跑一趟，資訊團隊還要追蹤新流程的問題。'},{label:'先盤點資料存取權限',effect:[-2,4,9],result:'權限責任更清楚，短期操作可能多一道確認。'}]}
};
export const selections=s=>Object.entries(s?.initiatives||{}).filter(([id,n])=>CASES[id]&&Number.isInteger(n)&&CASES[id].options[n]).slice(0,3);
export function choose(s,id,index){if(!CASES[id]?.options[index]||selections(s).length>=3||Object.hasOwn(s.initiatives||{},id))return false;s.initiatives={...(s.initiatives||{}),[id]:index};return true;}
export function outcome(s){const scores=[50,50,50];for(const [id,n] of selections(s))CASES[id].options[n].effect.forEach((v,i)=>scores[i]+=v);return scores;}
