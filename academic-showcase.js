// Visual-only example, deliberately NOT stored in SQLite and never returned by
// the University's official recognition API. Toggle must label it unmistakably.
// Canonical DB -> professor review -> department approval -> mapping is exercised
// separately by tests/academic-visualization.chrome.py.
// Fixed, reproducible showcase activities for a synthetic 40-student cohort.
// The twelve-month window follows the requested chart period; no database writes.
const programs=[
 ['공통교육 연구윤리 이수','P3',['R','E']],
 ['공통교육 데이터 분석 참여','P3',['M','I']],
 ['연구실 세미나 발표','P4',['R','A']],
 ['공동연구 실습 참여','P4',['I','M']],
 ['융합연구 성과 공유','P5',['A','E']],
 ['산학 워크숍 결과 정리','P5',['R','I']],
 ['연구결과 최종 발표','P6',['M','E']],
 ['진로·대학원 탐색 프로그램','P6',['A','I']]
];
function makeProof(endMonth){
 const [year,month]=endMonth.split('-').map(Number);
 if(!year||!month)throw new Error('A valid chart end month is required for the synthetic showcase');
 const result=[];
 for(let student=0;student<40;student++)for(let activity=0;activity<3;activity++){
  const [title,phase,mirae_codes]=programs[(student*3+activity)%programs.length];
  const monthOffset=(student*7+activity*3)%11;
  const date=new Date(Date.UTC(year,month-1-monthOffset,5+(student+activity*5)%22))
   .toISOString().slice(0,10);
  result.push({id:'S'+String(result.length+1).padStart(3,'0'),activity_day:date,
   title,phase,mirae_codes:[...mirae_codes],student_name:'가상 학생 '+String(student+1).padStart(2,'0'),student_id:null});
 }
 return result.sort((a,b)=>a.activity_day.localeCompare(b.activity_day)||a.id.localeCompare(b.id));
}
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
 const proof=makeProof(to);
 const selected=proof.filter(a=>a.activity_day.slice(0,7)>=from&&a.activity_day.slice(0,7)<=to);
 const series=actual.series.map(x=>{
  const accepted=selected.filter(a=>samplePeriod(a,actual.filters.group_by)===x.key);
  return {...x,...counts(accepted)};
 });
 return {
  ...actual,student_name:'별도 시연 예시 · 가상 학생 40명',
  current:counts(proof),selected_period:counts(selected),series,
  evidence:proof,source:'synthetic_chart_showcase',sample:true,
  student_count:40,
  notes:['시연 예시 120건은 실제 서버·학생 DB에 저장되지 않습니다.',
   '부서가 인정한 실제 활동이나 학생 평가 결과가 아닙니다.',
   '그래프 구성과 세부 근거 탐색을 확인하기 위한 가상 예시입니다.']
 };
}
