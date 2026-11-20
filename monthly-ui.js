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
   html+='<div class="inline-btns">'+action('멘토·지도교수 배정','monthlyAssignReviewers()')+
    action('6P·MIRAE 인정 기준 관리','monthlyEditCriteria()')+
    action('학생별 기준·현황 확인','monthlyChooseStudent()')+'</div>';
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
     (a.recognition==='recognized'?action('6P·MIRAE 연계','monthlyMapActivity('+a.id+','+r.student_id+')'):'')+
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
   const d=await api('/api/academic-progress/'+studentId);
   const statusLabel={achieved:'달성',supplement:'보완',deferred:'유예',not_achieved:'미달성'};
   const requirements=d.stages.map(x=>{
    const pairs=Object.entries(x.required).map(([k,v])=>{
     const name=k==='combined_program'?'프로그램·비교과':(kinds[k]||k);
     return esc(name)+' '+v+'건 요구 / '+x.counted[k]+'건 인정 / '+x.missing[k]+'건 부족';
    }).join('<br>');
    const links=x.evidence.length?'<details><summary>근거 '+x.evidence.length+'건</summary>'+
     x.evidence.map(a=>'<div class="micro">#'+a.id+' · '+esc(a.activity_day)+' '+esc(a.title)+'</div>').join('')+
      '</details>':'—';
    const review=x.decision?(esc(statusLabel[x.decision.state]||x.decision.state)+
     (x.decision.stale?' · <b>근거 변경·재검토 필요</b>':'')+'<br>'+esc(x.decision.reason)):'부서 미확정';
    const actionButton=state.user.role==='admin'?
     '<button class="link" onclick="app.monthlyDecideStage('+studentId+',\''+x.phase+'\')">심의 처리</button>':'';
    return [esc(x.phase),pairs||'부서 선발·초기 활동 확인 별도',links,
     (x.automatically_satisfied?'기본 수량 충족':'부족·검토 필요')+'<br>'+review+' '+actionButton];
   });
   const mirae=d.competencies.map(c=>{
    const evidence=c.evidence.length?'<details><summary>반영 '+c.recognized+'건</summary>'+
     c.evidence.map(a=>'<div class="micro">'+esc(a.activity_day)+' · #'+a.id+' '+esc(a.title)+'</div>').join('')+'</details>':'—';
    const monthly=c.monthly.map(item=>{
     const width=Math.min(100,Math.round(100*item.count/Math.max(1,c.recognized)));
     return '<div style="display:flex;gap:6px;align-items:center;min-width:150px">'+
      '<small>'+esc(item.month)+'</small><span style="height:7px;min-width:3px;background:#3d8fa3;width:'+width+'%;border-radius:6px"></span>'+
      '<small>'+item.count+'건</small></div>';
    }).join('')||'—';
    return [esc(c.code+' · '+c.label),c.required===null?'기준 미확정':c.required+'건',
     c.recognized+'건',c.status==='criteria_unset'?'기준 미확정':c.status==='satisfied'?'기준 충족':'부족',
     evidence,monthly];
   });
   if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();
   const exception=d.exception_8th_semester;
   const toolbar='<div class="inline-btns"><button class="btn" onclick="app.monthlyExportProgress('+studentId+')">화면 기준 CSV 추출</button>'+
    (state.user.role==='admin'?'<button class="btn" onclick="app.monthlyEditProfile('+studentId+')">학생 학기·예외 설정</button>'+
     '<button class="btn" onclick="app.monthlyEditCriteria()">6P·MIRAE 기준 관리</button>':'')+'</div>';
   openModal('6P·MIRAE 인정 실적 · 학생 '+studentId,
    '<p class="sub">부서 인정 완료 실적과 부서 지정 P단계만 집계합니다. 학생이 제안한 P단계는 최종 인정이 아닙니다.'+
    ' MIRAE는 기준이 없으면 점수·가중치를 만들지 않습니다.</p>'+toolbar+
    panel('6P 단계별 기본 충족·부서 확정',table(['단계','요구/인정/부족','인정 근거','부서 최종 상태'],requirements))+
    panel('MIRAE 5개 역량 · 인정 근거·기간별 변화',table(['역량','요구','인정','충족','근거','월별 분포'],mirae))+
    '<p class="sub">P1: '+esc(d.P1.status)+' · P2: '+esc(d.P2.status)+
    ' · P6 졸업·진학: '+esc(d.profile.graduation_status)+
    ' · 학년도/학기: '+d.profile.year+'/'+d.profile.term+
    ' · 기수: '+esc(d.profile.cohort)+' · 기준 출처: '+esc(d.criteria.source)+
    ' (판본 '+esc(d.criteria.revision??'기본')+')</p>'+
    (exception.eligible?'<p class="sub"><b>8학기 예외 · 부서 검토 대상</b> '+
     '프로그램·비교과 인정 '+exception.recognized_combined+'/2건, 선발 후 연구성과 '+exception.recognized_research_after_selection+
     '건, 확인된 월별 보고서 '+exception.reviewed_reports_after_selection+
     '건. 증빙 확인과 부서 결정 없이는 자동 달성 처리하지 않습니다.</p>':'')+
    (d.unmapped_activities.length?'<p class="sub">P단계 또는 MIRAE 미연계 인정 실적 '+
     d.unmapped_activities.length+'건 · 관리자가 개별 근거를 지정해야 집계됩니다.</p>':''));
  }catch(e){toast('조회 실패: '+e.message);}
 }
 async function monthlyExportProgress(studentId){
  try{
   const origin=window.STUDENT_API_BASE||'';
   const r=await fetch(origin+'/api/academic-export.csv?student_id='+studentId,{
    credentials:origin?'include':'same-origin'});
   if(!r.ok)throw Error('CSV 추출 실패 ('+r.status+')');
   const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='student-'+studentId+'-6p-mirae.csv';document.body.append(a);a.click();
   a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   toast('현재 화면과 동일 계산 기준의 CSV를 저장했습니다.');
  }catch(e){toast('CSV 오류: '+e.message);}
 }
 async function monthlyChooseStudent(){
  const {items}=await api('/api/users');
  const students=items.filter(x=>x.role==='student');
  openModal('학생별 6P·MIRAE 확인','<div class="table-scroll"><table class="data-table"><thead>'+
   '<tr><th>학생</th><th>이수현황</th><th>학기 설정</th></tr></thead><tbody>'+
   students.map(s=>'<tr><td>'+esc(s.name)+' · '+esc(s.username)+'</td>'+
    '<td><button class="link" onclick="app.monthlyProgress('+s.id+')">6P·MIRAE 보기</button></td>'+
    '<td><button class="link" onclick="app.monthlyEditProfile('+s.id+')">학기·예외</button></td></tr>').join('')+
    '</tbody></table></div>');
 }
 async function monthlyEditProfile(studentId){
  const d=await api('/api/academic-profile/'+studentId),p=d.profile;
  if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();
  const option=(v,current,text)=>'<option value="'+v+'" '+(v===current?'selected':'')+'>'+text+'</option>';
  const opts=states=>states.map(([v,t])=>option(v,p.graduation_status,t)).join('');
  openModal('학생 '+studentId+' · 학기·6P 초기 상태 설정',
   '<form><div class="form-grid"><label>학년도<input name="year" type="number" min="2020" max="2100" required value="'+p.year+'"></label>'+
   '<label>학기<select name="term">'+option(1,p.term,'1학기')+option(2,p.term,'2학기')+'</select></label>'+
   '<label>기수<input name="cohort" maxlength="50" required value="'+esc(p.cohort)+'"></label>'+
   '<label>현재 재학 학기<input name="semester_no" type="number" min="1" max="14" value="'+(p.semester_no??'')+'"></label>'+
   '<label>선발일<input name="selection_date" type="date" value="'+esc(p.selection_date||'')+'"></label>'+
   '<label>P1 선발·연구실 배치 확인<select name="p1_status">'+
    ['pending','confirmed','revision'].map(v=>option(v,p.p1_status,v)).join('')+'</select></label>'+
   '<label>P2 초기 계획·사전활동 확인<select name="p2_status">'+
    ['pending','confirmed','revision'].map(v=>option(v,p.p2_status,v)).join('')+'</select></label>'+
   '<label>졸업·진학 상태<select name="graduation_status">'+opts([
    ['pending','확인 전'],['enrolled','재학'],['graduated','졸업'],['completed','수료'],['admitted','대학원 진학']])+
    '</select></label></div><p class="sub">8학기 예외는 2026학년도 2학기 재학 8학기 정보를 기준으로 검토 표시만 합니다.</p>'+
    formActions,async f=>{
     const b=Object.fromEntries(f);b.year=Number(b.year);b.term=Number(b.term);
     b.semester_no=b.semester_no?Number(b.semester_no):null;b.selection_date=b.selection_date||null;
     await api('/api/academic-profile/'+studentId,{method:'PUT',body:JSON.stringify(b)});
     toast('학생 학기·기수 및 단계 상태를 저장했습니다.');
    });
 }
 async function monthlyEditCriteria(){
  const r=await api('/api/academic-rules');
  const rule=r.effective,base=rule.requirements;
  const codeName={M:'융합',I:'현장',R:'연구',A:'자기주도·공동체',E:'기초소양·시민의식'};
  const numberInput=(phase,k)=>'<label>'+esc(phase+' · '+(k==='combined_program'?'프로그램·비교과':k))+
   '<input type="number" min="0" max="50" name="'+phase+'.'+k+'" value="'+base[phase][k]+'" required></label>';
  if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();
  openModal('부서 6P·MIRAE 기준 설정 · 이력 보존',
   '<form><div class="form-grid"><label>학년도<input type="number" name="year" min="2020" max="2100" value="2026" required></label>'+
   '<label>학기<select name="term"><option value="1">1학기</option><option value="2" selected>2학기</option></select></label>'+
   '<label>기수<input name="cohort" maxlength="50" value="all" required></label></div>'+
   '<h3>6P 기준 건수</h3><div class="form-grid">'+
    ['P3','P4','P5','P6'].flatMap(p=>Object.keys(base[p]).map(k=>numberInput(p,k))).join('')+'</div>'+
   '<h3>MIRAE 인정 기준</h3><p class="micro">학교가 확정하지 않은 영역은 빈칸으로 유지 · 임의 배점 금지</p>'+
   '<div class="form-grid">'+Object.entries(codeName).map(([k,v])=>'<label>'+k+' · '+esc(v)+
    '<input type="number" name="mirae.'+k+'" min="0" max="50" placeholder="미확정" value="'+
    (rule.mirae_minima[k]??'')+'"></label>').join('')+'</div>'+
   '<label>변경 사유·적용 근거<textarea name="reason" maxlength="600" required></textarea></label>'+
   '<p class="micro">판본이 증가하며 과거 부서 확정 실적은 변경 기준과 대조할 때 재검토 대상으로 표시됩니다.</p>'+
   formActions,async f=>{
    const requirements={};for(const p of ['P3','P4','P5','P6']){
     requirements[p]={};
     for(const k of Object.keys(base[p]))requirements[p][k]=Number(f.get(p+'.'+k));
    }
    const mirae_minima={};
    for(const k of Object.keys(codeName)){
     const v=f.get('mirae.'+k);mirae_minima[k]=v===''?null:Number(v);
    }
    const body={year:Number(f.get('year')),term:Number(f.get('term')),cohort:f.get('cohort'),
     requirements,mirae_minima,reason:f.get('reason')};
    await api('/api/academic-rules',{method:'PUT',body:JSON.stringify(body)});
    toast('기준·적용 사유·변경 이력을 DB에 저장했습니다.');
   });
 }
 async function monthlyMapActivity(activityId,studentId){
  const d=await api('/api/academic-progress/'+studentId);
  const existing=d.activities.find(x=>x.id===activityId);
  if(!existing)throw Error('부서 인정 실적이 아닙니다.');
  if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();
  const options=['','P1','P2','P3','P4','P5','P6'].map(k=>'<option value="'+k+'" '+
   ((existing.phase||'')===k?'selected':'')+'>'+(k||'단계 미확정')+'</option>').join('');
  const labels={M:'융합',I:'현장',R:'연구',A:'자기주도·공동체',E:'기초소양·시민의식'};
  openModal('실적 '+activityId+' · 부서 단계·복수역량 연계',
   '<form><p class="sub">'+esc(existing.title)+' · '+esc(existing.activity_day)+
    '<br>학생 제안 '+esc(existing.proposed_stage?'P'+existing.proposed_stage:'미정')+
    ' / 부서 확정 '+esc(existing.phase||'미정')+'</p>'+
    '<label>부서 인정 P단계<select name="phase">'+options+'</select></label>'+
    '<fieldset style="padding:12px;border:1px solid #dae4eb;border-radius:8px"><legend>MIRAE 복수 영역</legend>'+
    Object.entries(labels).map(([k,v])=>'<label class="check"><input type="checkbox" name="mirae_codes" value="'+k+'" '+
     (existing.mirae_codes.includes(k)?'checked':'')+'> '+k+' · '+esc(v)+'</label>').join('')+'</fieldset>'+
    '<label>연계/변경 근거<textarea name="reason" maxlength="600" required></textarea></label>'+formActions,
    async f=>{
     await api('/api/academic-activity-mapping/'+activityId,{method:'PUT',body:JSON.stringify({
      phase:f.get('phase')||null,mirae_codes:f.getAll('mirae_codes'),reason:f.get('reason')})});
     toast('6P 단계 및 MIRAE 연계를 저장했습니다. 재집계가 즉시 적용됩니다.');
    });
 }
 async function monthlyDecideStage(studentId,phase){
  openModal('부서 '+phase+' 최종 판정 · 학생 '+studentId,
   '<form><label>심의결과<select name="decision">'+
    [['achieved','달성'],['supplement','보완'],['deferred','유예'],['not_achieved','미달성']].map(([v,n])=>
     '<option value="'+v+'">'+n+'</option>').join('')+'</select></label>'+
    '<label class="check"><input type="checkbox" name="manual_exception" value="yes">기본 요건 미충족 예외 승인</label>'+
    '<label>심의 사유·근거<textarea name="reason" maxlength="600" required></textarea></label>'+
    '<p class="micro">기준 미충족 상태의 달성 확정은 명시적 예외 승인과 상세 사유가 필요합니다. 이후 실적·기준 변경은 재검토로 표시됩니다.</p>'+
    formActions,async f=>{
     await api('/api/academic-stage-decisions',{method:'POST',body:JSON.stringify({
      student_id:studentId,phase,decision:f.get('decision'),reason:f.get('reason'),
      manual_exception:f.get('manual_exception')==='yes'})});
     toast('최종 판정·근거·처리자 이력을 저장했습니다.');
    });
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
  reviewMonthlyReport,monthlyDetail,monthlyRecognition,monthlyProgress,monthlyExportProgress,
  monthlyChooseStudent,monthlyEditProfile,monthlyEditCriteria,monthlyMapActivity,monthlyDecideStage,monthlyAssignReviewers}};
}
