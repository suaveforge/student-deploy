// Visual-only example, deliberately NOT stored in SQLite and never returned by
// the University's official recognition API. Toggle must label it unmistakably.
// Canonical DB -> professor review -> department approval -> mapping is exercised
// separately by tests/academic-visualization.chrome.py.
const proof=[
 ['S01','2026-06-12','공통교육 연구윤리 이수','P3',['R','E'],'가상 학생 A'],
 ['S02','2026-07-03','융합 기초교육 참여','P3',['M','E'],'가상 학생 A'],
 ['S03','2026-08-22','산학 워크숍 결과 정리','P4',['I','M'],'가상 학생 B'],
 ['S04','2026-09-10','연구실 세미나 발표','P4',['R','A'],'가상 학생 B'],
 ['S05','2026-09-29','비교과 협업 프로그램','P5',['A','I'],'가상 학생 C'],
 ['S06','2026-10-18','논문 초록 발표','P5',['R','M'],'가상 학생 C'],
 ['S07','2026-11-04','진로 실무 프로그램','P6',['I','A'],'가상 학생 D'],
 ['S08','2026-11-14','최종 연구성과 발표','P6',['R','E'],'가상 학생 D']
].map(([id,activity_day,title,phase,mirae_codes,student_name])=>({
 id,activity_day,title,phase,mirae_codes,student_name,student_id:null
}));
const zeros=keys=>Object.fromEntries(keys.map(k=>[k,0]));
function counts(rows){
 const competencies=zeros(['M','I','R','A','E']),phases=zeros(['P1','P2','P3','P4','P5','P6']);
 for(const a of rows){for(const k of a.mirae_codes)competencies[k]++;
  phases[a.phase]++}
 return {competencies,phases,unique_activities:rows.length,
  competency_links:Object.values(competencies).reduce((n,v)=>n+v,0)};
}
function samplePeriod(row,group){
 const [year,month]=row.activity_day.slice(0,7).split('-').map(Number);
 if(group==='month')return String(year)+'-'+String(month).padStart(2,'0');
 return month>=3&&month<=8?year+'-1':month>=9?year+'-2':(year-1)+'-2';
}
export function sampleVisualization(actual){
 const from=actual.filters.from,to=actual.filters.to;
 const selected=proof.filter(a=>a.activity_day.slice(0,7)>=from&&a.activity_day.slice(0,7)<=to);
 const series=actual.series.map(x=>{
  const accepted=selected.filter(a=>samplePeriod(a,actual.filters.group_by)===x.key);
  return {...x,...counts(accepted)};
 });
 return {
  ...actual,student_name:'별도 시연 예시 · 가상 학생 4명',
  current:counts(proof),selected_period:counts(selected),series,
  evidence:proof,source:'synthetic_chart_showcase',sample:true,
  student_count:4,
  notes:['시연 예시 8건은 실제 서버·학생 DB에 저장되지 않습니다.',
   '부서가 인정한 실제 활동이나 학생 평가 결과가 아닙니다.',
   '그래프 구성과 세부 근거 탐색을 확인하기 위한 가상 예시입니다.']
 };
}
