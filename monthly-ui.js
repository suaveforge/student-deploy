// W01 RFP #4–#7: operational proof UI on the existing signed-in workspace.
// Official university semester exceptions and MIRAE weighted standards remain unconfigured.
export function makeMonthlyUI(h){
 const {api,state,pageHead,panel,table,esc,openModal,toast,loadView}=h;
 const status={
  draft:'임시저장',submitted:'교수별 확인 중',revision:'보완 요청',
  department_review:'두 교수 확인 완료 · 부서 심사'
 };
 const decisions={pending:'미확인',confirmed:'확인 완료',revision:'보완 요청',
  recognized:'인정',rejected:'반려',cancelled:'인정취소'};
 const kinds={common_education:'공통교육',program:'사업 프로그램',
  extracurricular:'교내외 비교과',research:'연구성과'};
 let cache=[];
 const dataBody=obj=>({method:'POST',body:JSON.stringify(obj)});
 const formActions='<div class="modal-actions"><button class="btn primary" type="submit">저장</button></div></form>';
 const action=(label,method)=>'<button class="btn" type="button" onclick="app.'+method+'">'+esc(label)+'</button>';
 const rowHead=x=>'<b>'+esc(x.title)+'</b><br><span class="micro">'+esc(x.target_month)+' · '+esc(x.student||'나')+
  ' · 제출본 '+Number(x.revision)+'</span>';
 const showReviewer=x=>x.reviewers.map(p=>
  '<div class="info-row"><b>'+esc(p.role==='mentor'?'멘토교수':'지도교수')+'</b><span>'+
  esc(p.professor)+' · '+esc(decisions[p.decision]||p.decision)+
  (p.feedback?' · '+esc(p.feedback):'')+'</span></div>').join('');
 async function page(){
  const {items}=await api('/api/monthly-reports');cache=items;
  const role=state.user.role,student=role==='student',admin=role==='admin';
  const actions=student?'<button class="btn" onclick="app.newMonthlyActivity()">＋ 실적 등록</button>'+
    '<button class="btn primary" onclick="app.newMonthlyReport()">＋ 월별 보고서</button>':'';
  const intro=student?'월별 보고서를 임시저장한 뒤 두 교수에게 동시에 제출합니다.':
   admin?'두 교수 확인 완료 건의 실적을 건별로 인정·보완·반려합니다.':
    '멘토·지도교수의 확인은 독립적으로 저장되며 미확인 학생을 별도로 볼 수 있습니다.';
  const rows=items.map(x=>{
   const review=x.reviewers.map(p=>(p.role==='mentor'?'멘토':'지도')+' '+(decisions[p.decision]||p.decision)).join(' / ');
   const assigned=x.reviewers.find(p=>p.professor_id===state.user.id&&p.decision==='pending');
   let buttons='<button class="link" onclick="app.monthlyDetail('+x.id+')">상세·이력 →</button>';
   if(student&&['draft','revision'].includes(x.status))
    buttons+=' <button class="link" onclick="app.editMonthlyReport('+x.id+')">수정</button>'+
      ' <button class="link" onclick="app.submitMonthlyReport('+x.id+')">제출</button>';
   if(role==='professor'&&x.status==='submitted'&&assigned)
    buttons+=' <button class="link" onclick="app.reviewMonthlyReport('+x.id+',\'confirmed\')">확인</button>'+
     ' <button class="link" onclick="app.reviewMonthlyReport('+x.id+',\'revision\')">보완 요청</button>';
   return [rowHead(x),'<span class="pill '+esc(x.status)+'">'+esc(status[x.status]||x.status)+'</span>',
     esc(review),'<span class="micro">'+x.activities.length+'건 연결</span>',buttons];
  });
  let html=pageHead('MONTHLY REVIEWS','월별 보고서 · 교수 확인 · 부서 인정',intro,actions)+
   panel('보고서 상태',table(['대상 월 · 학생','보고서 상태','두 교수 확인','연결 실적','업무'],
    rows,'등록된 월별 보고서가 없습니다.'),'원본 과업 4 · 기존 활동계획 승인과 별도');
  if(student){
   const a=(await api('/api/monthly-activities')).items;
   html+=panel('내 활동·성과 신청',table(['활동명','유형','일자','인정상태'],
    a.map(x=>[esc(x.title),esc(kinds[x.kind]||x.kind),esc(x.activity_day),
     esc(decisions[x.recognition]||'미인정')])),'인정 이전에는 6P·MIRAE 달성값에 포함하지 않습니다.');
   html+='<div class="inline-btns">'+action('6P 충족·부족 현황 보기','monthlyProgress('+state.user.id+')')+'</div>';
  }else if(admin){
   html+='<p class="sub">학생별 담당 교수 변경은 두 교수 배정 화면에서만 가능합니다. 별도 부서 심사 결과는 실적별로 기록됩니다.</p>';
   html+='<div class="inline-btns">'+action('멘토·지도교수 배정','monthlyAssignReviewers()')+'</div>';
  }
  document.querySelector('#main').innerHTML=html;
 }
 function findReport(id){return cache.find(x=>x.id===Number(id));}
 function activityFields(rows,selected=[]){
  return '<fieldset style="border:1px solid #dfe6ef;border-radius:10px;padding:12px"><legend>관련 활동·성과 선택 (선택)</legend>'+
    (rows.length?rows.map(a=>'<label class="check"><input type="checkbox" name="activity_ids" value="'+a.id+
      '" '+(selected.includes(a.id)?'checked':'')+'> '+esc(a.activity_day+' · '+a.title)+
      ' ('+esc(kinds[a.kind]||a.kind)+')</label>').join(''):
      '<p class="micro">등록된 활동이 없습니다. 먼저 실적을 등록하세요.</p>')+'</fieldset>';
 }
 function reportForm(plans,activities,row={}){
  const now=new Date().toISOString().slice(0,7);
  const pick=plans.map(p=>'<option value="'+p.id+'" '+(Number(row.plan_id)===p.id?'selected':'')+'>'+esc(p.title)+'</option>').join('');
  return '<form><div class="form-grid"><label>보고 대상 월<input name="target_month" type="month" required value="'+
   esc(row.target_month||now)+'" '+(row.id?'disabled':'')+'></label>'+
   '<label>관련 계획<select name="plan_id" required '+(row.id?'disabled':'')+'>'+pick+'</select></label>'+
   '<label class="full">보고서 제목<input name="title" maxlength="160" required value="'+esc(row.title||'')+'"></label>'+
   '<label class="full">활동·참여·성과 내용<textarea name="content" maxlength="6000" required>'+
    esc(row.content||'')+'</textarea></label>'+
   '<label class="full">향후 계획<textarea name="future_plan" maxlength="3000" required>'+esc(row.future_plan||'')+
    '</textarea></label></div>'+
   activityFields(activities,row.activities?.map(a=>a.id)||[])+
   '<p class="micro">교수 확인·부서 인정 이후에는 일반 수정이 차단됩니다. 공식 원본 서식의 나머지 세부 항목은 별도 구현 대상입니다.</p>'+
   formActions;
 }
 async function newMonthlyActivity(){
  const options=Object.entries(kinds).map(([v,n])=>'<option value="'+v+'">'+esc(n)+'</option>').join('');
  const stages=[1,2,3,4,5,6].map(n=>'<option value="'+n+'">P'+n+'</option>').join('');
  openModal('가상 활동·성과 등록','<form><label>활동명<input name="title" maxlength="160" required></label>'+
   '<label>활동 유형<select name="kind">'+options+'</select></label>'+
   '<label>활동일<input name="activity_day" type="date" required></label>'+
   '<label>제안 P단계<select name="proposed_stage"><option value="">미정</option>'+stages+'</select></label>'+
   '<label>활동 내용<textarea name="details" maxlength="2000"></textarea></label>'+
   '<p class="micro">학생의 P단계 선택은 제안값입니다. 부서의 실제 인정·단계 확정이 아닙니다.</p>'+formActions,
   async f=>{
    const b=Object.fromEntries(f);b.proposed_stage=b.proposed_stage?Number(b.proposed_stage):null;
    await api('/api/monthly-activities',dataBody(b));
    toast('가상 활동이 DB에 저장되었습니다. 부서 인정 전에는 이수 실적이 아닙니다.');
   });
 }
 async function newMonthlyReport(){
  const [plans,activities]=await Promise.all([api('/api/plans'),api('/api/monthly-activities')]);
  if(!plans.items.length){toast('먼저 활동계획을 등록하세요.');return;}
  openModal('월별 활동보고서 임시저장',reportForm(plans.items,activities.items),async f=>{
   const b=Object.fromEntries(f);b.plan_id=Number(b.plan_id);
   b.activity_ids=f.getAll('activity_ids').map(Number);
   await api('/api/monthly-reports',dataBody(b));
   toast('월별 보고서가 임시저장되었습니다.');
  });
 }
 async function editMonthlyReport(rid){
  const r=findReport(rid);if(!r)return;
  const [plans,activities]=await Promise.all([api('/api/plans'),api('/api/monthly-activities')]);
  openModal('월별 보고서 수정 · '+r.target_month,reportForm(plans.items,activities.items,r),async f=>{
   const b=Object.fromEntries(f);b.activity_ids=f.getAll('activity_ids').map(Number);
   await api('/api/monthly-reports/'+rid,{method:'PATCH',body:JSON.stringify(b)});
   toast('기존 보고서에 수정 내용이 연결됐습니다.');
  });
 }
 async function submitMonthlyReport(rid){
  if(!confirm('현재 제출본을 두 교수에게 동시에 전달하고, 확인 이력을 새로 시작할까요?'))return;
  try{
   const d=await api('/api/monthly-reports/'+rid+'/submit',dataBody({action:'submit'}));
   toast('제출본 '+d.revision+'차 저장 · 멘토·지도교수 확인 대기');
   await loadView();
  }catch(e){toast('제출 실패: '+e.message);}
 }
 async function reviewMonthlyReport(rid,decision){
  const r=findReport(rid);if(!r)return;
  const revision=decision==='revision';
  openModal(revision?'월별 보고서 보완 요청':'교수 확인 · 보고서 '+r.target_month,
   '<form><p class="sub">'+esc(r.title)+' · 제출본 '+r.revision+
    '차. 내 확인결과만 기록하며 다른 교수의 처리는 변경하지 않습니다.</p>'+
    '<label>교수 의견<textarea name="feedback" maxlength="1000" '+(revision?'required':'')+'></textarea></label>'+
    '<div class="modal-actions"><button class="btn primary" type="submit">'+
    (revision?'보완 요청 저장':'확인 완료 저장')+'</button></div></form>',
    async f=>{
     await api('/api/monthly-reports/'+rid+'/review',dataBody({decision,feedback:f.get('feedback')}));
     toast('독립 교수 확인 상태와 이력이 저장됐습니다.');
    });
 }
 async function monthlyDetail(id){
  const r=findReport(id);if(!r)return;
  let h='<div class="info-row"><b>대상 월 · 제출본</b><span>'+esc(r.target_month)+' · '+r.revision+'차</span></div>'+
   '<div class="info-row"><b>활동 내용</b><span>'+esc(r.content)+'</span></div>'+
   '<div class="info-row"><b>향후 계획</b><span>'+esc(r.future_plan)+'</span></div>'+
    showReviewer(r);
  const role=state.user.role;
  const rows=r.activities.map(a=>{
   const recognised=decisions[a.recognition]||'미인정';
   let buttons='미확정';
   if(role==='admin'&&r.status==='department_review'){
    buttons='<div class="inline-btns">'+
     (a.recognition!=='recognized'?action('인정','monthlyRecognition('+r.id+','+a.id+',\'recognized\')'):
      action('인정취소','monthlyRecognition('+r.id+','+a.id+',\'cancelled\')'))+
     action('보완','monthlyRecognition('+r.id+','+a.id+',\'revision\')')+
     action('반려','monthlyRecognition('+r.id+','+a.id+',\'rejected\')')+'</div>';
   }
   return [esc(a.title),esc(kinds[a.kind]||a.kind),esc(recognised),
    esc(a.recognition_reason||'—'),buttons];
  });
  h+=panel('실적별 부서 처리',table(['연결 실적','유형','부서 인정','사유','처리'],rows),
   '두 교수 모두 확인 완료 후에만 실적 인정이 가능합니다.');
  if(r.review_history.length)
   h+=panel('제출본별 교수 확인 이력',table(['회차','담당','결과','의견'],r.review_history.map(x=>[
    esc(x.revision+'차'),esc(x.reviewer_role==='mentor'?'멘토':'지도'),
    esc(decisions[x.decision]||x.decision),esc(x.feedback||'—')])));
  openModal(r.title,h+'<div class="modal-actions"><button class="btn" onclick="app.monthlyProgress('+r.student_id+')">6P 근거 현황</button></div>');
 }
 async function monthlyRecognition(rid,aid,decision){
  const reasonRequired=decision!=='recognized';
  openModal('부서 실적 처리 · '+(decisions[decision]||decision),
   '<form><p class="sub">교수별 확인 완료 보고서에서 실적 한 건만 처리합니다. 취소·변경 이력을 DB에 보존합니다.</p>'+
    '<label>부서 처리 사유<textarea name="reason" maxlength="1000" '+
     (reasonRequired?'required':'')+'></textarea></label>'+
    '<div class="modal-actions"><button class="btn primary" type="submit">처리·이력 저장</button></div></form>',
    async f=>{
     await api('/api/monthly-reports/'+rid+'/recognitions/'+aid,
      dataBody({decision,reason:f.get('reason')}));
     toast('실적 처리 및 자동 집계 근거가 갱신됐습니다.');
    });
 }
 async function monthlyProgress(studentId){
  try{
   const d=await api('/api/learning-progress/'+studentId);
   const rows=d.stages.map(x=>{
    const criteria=Object.entries(x.required).map(([k,v])=>{
     const n=k==='combined_program'?'프로그램·비교과':(kinds[k]||k);
     return esc(n+': 요구 '+v+'건 / 인정 '+x.counted[k]+'건 / 부족 '+x.missing[k]+'건');
    }).join('<br>');
    return [esc(x.phase),criteria,x.automatically_satisfied?'기본 수량 충족':'부족 요건 있음',
     '학기말 부서 확정 별도'];
   });
   if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();
   openModal('6P 인정 실적 · 학생 '+studentId,
    '<p class="sub">원본 제안요청서에 명시된 P3~P6 기본 건수만 표시. 학생 제안 P단계 기준이며 예외·대체·최종 이수 판정은 아직 미설정입니다.</p>'+
    panel('단계별 요구·인정·부족',table(['단계','기본 요건·근거','기본 수량','최종 확정'],rows))+
    '<p class="sub">P1: '+esc(d.P1.status)+' / P2: '+esc(d.P2.status)+
    '<br>8학기 예외: '+esc(d.exception_8th_semester)+
    '<br>MIRAE: '+esc(d.MIRAE.mapping_status)+' · '+esc(d.MIRAE.note)+'</p>');
  }catch(e){toast('조회 실패: '+e.message);}
 }
 async function monthlyAssignReviewers(){
  const [users,assignments]=await Promise.all([api('/api/users'),api('/api/reviewer-assignments')]);
  const prof=users.items.filter(u=>u.role==='professor'),students=users.items.filter(u=>u.role==='student');
  const options=prof.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('');
  const advisorOptions=prof.map((p,i)=>'<option value="'+p.id+'" '+(i===1?'selected':'')+'>'+esc(p.name)+'</option>').join('');
  const roster=students.map(s=>'<option value="'+s.id+'">'+esc(s.name)+' · '+esc(s.username)+'</option>').join('');
  openModal('멘토교수·지도교수 개별 배정',
   '<form><label>가상 참여학생<select name="student_id">'+roster+'</select></label>'+
   '<label>멘토교수<select name="mentor_professor_id">'+options+'</select></label>'+
   '<label>지도교수<select name="advisor_professor_id">'+advisorOptions+'</select></label>'+
   '<p class="sub">동일 교수 겸임·부재 예외는 학교 기준 확정 전 금지합니다. 두 배정 모두 필수입니다.</p>'+
   '<div class="modal-actions"><button class="btn primary" type="submit">교수 배정 저장</button></div></form>',
   async f=>{
    const student=Number(f.get('student_id')),mentor=Number(f.get('mentor_professor_id')),
      advisor=Number(f.get('advisor_professor_id'));
    if(mentor===advisor)throw Error('멘토·지도교수는 다른 교수를 선택하세요.');
    await api('/api/reviewer-assignments/'+student,{method:'PUT',
     body:JSON.stringify({mentor_professor_id:mentor,advisor_professor_id:advisor})});
    toast('교수 두 명의 배정과 처리자 이력이 저장됐습니다.');
   });
 }
 return {page,actions:{newMonthlyActivity,newMonthlyReport,editMonthlyReport,submitMonthlyReport,
  reviewMonthlyReport,monthlyDetail,monthlyRecognition,monthlyProgress,monthlyAssignReviewers}};
}
