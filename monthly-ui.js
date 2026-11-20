import {loadECharts,renderHorizontal,renderPhaseProgress,renderMiraeTrend,renderPeriodHeatmap,renderReviewStack,renderPhaseHeatmap,renderMiraeMatrix,disposeCharts} from './charts-ui.js';
import {sampleVisualization} from './academic-showcase.js';
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
  let html=pageHead('월별 보고서','월별 보고서 · 교수 확인 · 부서 인정',intro,actions)+
   panel('보고서 상태',table(['대상 월 · 학생','보고서 상태','두 교수 확인','연결 실적','업무'],
    rows,'등록된 월별 보고서가 없습니다.'),'교수 2명 확인 후 부서 심사');
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
    action('MIRAE 5개 영역 명칭·정의','monthlyEditMiraeCatalog()')+
    action('부서 전체 MIRAE·6P 그래프·인쇄',"monthlyVisualize('department')")+
    action('학생별 기준·현황 확인','monthlyChooseStudent()')+
    action('부서 전체 현황·CSV 추출','monthlyAdminOverview()')+'</div>';
  }
  const finals=(await api('/api/final-reports')).items;
  const finalActions=student?'<button class="btn primary" onclick="app.newFinalReport()">＋ 최종 연구결과보고서</button>':'';
  const finalRows=finals.map(f=>{
   const current=f.reviews.filter(x=>x.revision===f.revision);
   let actions='<button class="link" onclick="app.finalReportDetail('+f.id+')">상세·이전 제출본</button>';
   if(student&&['draft','revision'].includes(f.status))
    actions+=' <button class="link" onclick="app.editFinalReport('+f.id+')">수정</button> <button class="link" onclick="app.submitFinalReport('+f.id+')">제출</button>';
   if(role==='professor'&&f.status==='submitted'&&f.assignments.some(a=>a.professor_id===state.user.id)&&
    !current.some(a=>a.professor_id===state.user.id))
    actions+=' <button class="link" onclick="app.reviewFinalReport('+f.id+',\'confirmed\')">확인</button>'+
     ' <button class="link" onclick="app.reviewFinalReport('+f.id+',\'revision\')">보완 요청</button>';
   return [esc(f.title),esc(f.status),f.revision+'차',current.length+'/2명',actions];
  });
  html+=panel('최종 연구결과보고서',
   finalActions+table(['보고서','상태','제출 차수','교수별 확인','업무'],finalRows,'최종 연구결과보고서가 없습니다.'),
   '수행내용·성과·향후 계획을 제출하고 이전 제출본 및 교수별 확인 이력을 보존합니다.');
  let reviewData=[];
  if(!student){
   const map=new Map();
   for(const report of items){
    for(const reviewer of report.reviewers||[]){
     if(role==='professor'&&reviewer.professor_id!==state.user.id)continue;
     const key=reviewer.professor_id+'-'+reviewer.role;
     if(!map.has(key))map.set(key,{name:reviewer.professor+' · '+(reviewer.role==='mentor'?'멘토':'지도'),confirmed:0,pending:0,revision:0});
     const cell=map.get(key),status=reviewer.decision;
     cell[status==='confirmed'?'confirmed':status==='revision'?'revision':'pending']++;
    }
   }
   reviewData=[...map.values()];
   if(reviewData.length)html+=panel('교수별 월별 보고서 확인 현황',
    '<div id="monthly-review-chart" class="research-chart chart-review" role="img" aria-label="교수별 확인·미확인·보완 요청 건수"></div>',
    '현재 조회된 월별 보고서의 교수별 확인 건수');
  }
  document.querySelector('#main').innerHTML=html;
  if(reviewData.length){await loadECharts();renderReviewStack('monthly-review-chart',reviewData)}
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
   '<label class="full">참여내역<textarea name="participation_details" maxlength="4000" required>'+esc(row.participation_details||'')+'</textarea></label>'+
   '<label class="full">주요 성과<textarea name="outcomes" maxlength="4000" required>'+esc(row.outcomes||'')+'</textarea></label>'+
   '<label class="full">향후 계획<textarea name="future_plan" maxlength="3000" required>'+esc(row.future_plan||'')+
    '</textarea></label></div>'+
   activityFields(activities,row.activities?.map(a=>a.id)||[])+
   '<p class="micro">교수 확인 후에는 일반 수정이 제한됩니다. 학교 확정 서식과 추가 대조가 필요합니다.</p>'+
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
 async function monthlyAddEvidence(rid){
  if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();
  openModal('월별 보고서 '+rid+' · 증빙 첨부',
   '<form><label>PDF·PNG·JPG·TXT 파일 (최대 2MB/개, 총 5개)'+
    '<input type="file" name="evidence_file" accept=".pdf,.png,.jpg,.jpeg,.txt" required></label>'+
    '<p class="micro">보고서 임시저장 또는 보완 요청 중에만 추가·삭제할 수 있습니다.</p>'+
    formActions,async (_f,form)=>{
     const file=form.querySelector('input[type=file]').files[0];
     if(!file)throw Error('파일을 선택하세요.');
     if(file.size<1||file.size>2*1024*1024)throw Error('파일당 2MB 이내로 선택하세요.');
     const ext=file.name.split('.').pop().toLowerCase();
     const mime={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',
      jpeg:'image/jpeg',txt:'text/plain'}[ext];
     if(!mime)throw Error('PDF·PNG·JPG·TXT만 첨부할 수 있습니다.');
     const bytes=new Uint8Array(await file.arrayBuffer());let binary='';
     for(let i=0;i<bytes.length;i+=8192)
      binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
     const base64=btoa(binary);
     await api('/api/monthly-reports/'+rid+'/attachments',{method:'POST',
      body:JSON.stringify({name:file.name,mime,base64})});
     toast('증빙파일이 보고서에 저장되어 두 교수의 열람 대상에 포함됐습니다.');
    });
 }
 async function monthlyDeleteEvidence(evidenceId){
  if(!confirm('아직 제출하지 않은 증빙파일을 삭제하시겠습니까?'))return;
  try{
   await api('/api/monthly-evidence/'+evidenceId,{method:'DELETE'});
   if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();
   toast('증빙파일을 삭제했습니다.');await loadView();
  }catch(e){toast('증빙 삭제 오류: '+e.message);}
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
   '<div class="info-row"><b>참여내역</b><span>'+esc(r.participation_details||'—')+'</span></div>'+
   '<div class="info-row"><b>성과</b><span>'+esc(r.outcomes||'—')+'</span></div>'+
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
  const base=window.STUDENT_API_BASE||'';
  const files=(r.attachments||[]).map(x=>{
   const safe=base+'/api/monthly-evidence/'+x.id;
   return [esc(x.filename),esc(x.mime),Number(x.file_size).toLocaleString('ko-KR')+' bytes',
    '<a class="link" target="_blank" rel="noopener noreferrer" href="'+esc(safe)+'">다운로드</a>'+
     (role==='student'&&['draft','revision'].includes(r.status)&&!x.locked_submitted?
      ' <button class="link" onclick="app.monthlyDeleteEvidence('+x.id+')>삭제</button>':'')];
  });
  h+=panel('보고서 첨부 증빙',table(['파일명','형식','크기','열람'],files,'첨부된 증빙이 없습니다.'),
   '본인·멘토교수·지도교수·부서만 열람할 수 있습니다. 제출 후에는 파일 임의 변경이 차단됩니다.');
  h+='<div class="inline-btns">'+
   '<a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(base+'/api/monthly-reports/'+r.id+'/print')+'">보고서 인쇄 / PDF 저장</a>'+
   (role==='student'&&['draft','revision'].includes(r.status)?
    '<button class="btn" onclick="app.monthlyAddEvidence('+r.id+')">증빙 첨부</button>':'')+'</div>';
  if(r.versions?.length)h+=panel('제출본 원문 보존 · 이전 제출본 이력',
   table(['제출 차수','제출일','보존된 보고서 내용','관련 실적','첨부'],
    r.versions.map(v=>[v.revision+'차',esc(v.submitted_at),
     '<details><summary>'+esc(v.snapshot.title)+'</summary><p>'+esc(v.snapshot.content)+
      '</p><p>참여내역: '+esc(v.snapshot.participation_details||'—')+
      '</p><p>성과: '+esc(v.snapshot.outcomes||'—')+
      '</p><p>향후 계획: '+esc(v.snapshot.future_plan)+'</p></details>',
     v.snapshot.activities.map(a=>'#'+a.id+' '+esc(a.title)).join('<br>')||'—',
     v.snapshot.attachments.map(a=>esc(a.filename)).join('<br>')||'—'])),
   '재제출 시 새 차수를 저장하며 이전 제출본·당시 첨부 기록·교수 확인 결과를 보존합니다.');
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
     toast('실적 처리 결과를 저장했습니다.');
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
    const monthly=c.monthly.map(item=>'<div class="period-count">'+esc(item.month)+' · <b>'+item.count+'건</b></div>').join('')||'—';
    return [esc(c.code+' · '+c.label),c.required===null?'기준 미확정':c.required+'건',
     c.recognized+'건',c.status==='criteria_unset'?'기준 미확정':c.status==='satisfied'?'기준 충족':'부족',
     evidence,monthly];
   });
   if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();
   const exception=d.exception_8th_semester;
   const toolbar='<div class="inline-btns"><button class="btn" onclick="app.monthlyVisualize('+studentId+')">MIRAE·6P 그래프 / 기간 비교 / 인쇄</button>'+
    '<button class="btn" onclick="app.monthlyExportProgress('+studentId+')">화면 기준 CSV 추출</button>'+
    (state.user.role==='admin'?'<button class="btn" onclick="app.monthlyEditProfile('+studentId+')">학생 학기·예외 설정</button>'+
     '<button class="btn" onclick="app.monthlyEditCriteria()">6P·MIRAE 기준 관리</button>':'')+'</div>';
   openModal('6P·MIRAE 인정 실적 · 학생 '+studentId,
    '<p class="sub">부서 인정 완료 실적과 부서 지정 P단계만 집계합니다. 학생이 제안한 P단계는 최종 인정이 아닙니다.'+
    ' MIRAE 공식 기준 미확정 항목은 수치로 환산하지 않습니다.</p>'+toolbar+
    panel('6P 단계별 기본 충족·부서 확정',table(['단계','요구/인정/부족','인정 근거','부서 최종 상태'],requirements))+
    panel('월별 MIRAE 인정 분포','<div id="mirae-period-matrix" class="research-chart chart-matrix" role="img" aria-label="MIRAE 영역별 월별 실적 분포"></div>','현재 부서 인정 완료 실적 기준')+
    panel('MIRAE 5개 역량 · 인정 근거·기간별 변화',table(['역량','요구','인정','충족','근거','월별 분포'],mirae))+
    '<p class="sub">P1: '+esc(d.P1.status)+' · P2: '+esc(d.P2.status)+
    ' · P1 연구실: '+esc(d.profile.research_lab||'미등록')+
    ' · P1 확인근거: '+esc(d.profile.p1_evidence||'미등록')+
    ' · P2 확인근거: '+esc(d.profile.p2_evidence||'미등록')+
    ' · P6 졸업·진학: '+esc(d.profile.graduation_status)+
    ' · 대학원 진학확인: '+esc(d.profile.postgraduate_admission_status||'pending')+
    ' · 진학기관: '+esc(d.profile.postgraduate_destination||'미등록')+
    ' · 학년도/학기: '+d.profile.year+'/'+d.profile.term+
    ' · 기수: '+esc(d.profile.cohort)+' · 기준 출처: '+esc(d.criteria.source)+
    ' (판본 '+esc(d.criteria.revision??'기본')+')</p>'+
    (exception.eligible?'<p class="sub"><b>8학기 예외 · 부서 검토 대상</b> '+
     '프로그램·비교과 인정 '+exception.recognized_combined+'/2건, 선발 후 연구성과 '+exception.recognized_research_after_selection+
     '건, 확인된 월별 보고서 '+exception.reviewed_reports_after_selection+
     '건. 증빙 확인과 부서 결정 없이는 자동 달성 처리하지 않습니다.</p>':'')+
    (d.unmapped_activities.length?'<p class="sub">P단계 또는 MIRAE 미연계 인정 실적 '+
     d.unmapped_activities.length+'건 · 관리자가 개별 근거를 지정해야 집계됩니다.</p>':''));
   await loadECharts();
   renderMiraeMatrix('mirae-period-matrix',d.competencies);
  }catch(e){toast('조회 실패: '+e.message);}
 }

 async function monthlyVisualize(studentId){
  const origin=window.STUDENT_API_BASE||'';
  const base='/api/academic-visualization/'+studentId;
  const initial=await api(base);
  // Read-only academic result. The illustrative sample is never posted to DB.
  const progress=studentId==='department'?null:await api('/api/academic-progress/'+studentId);
  let sample=studentId==='department'&&initial.current.unique_activities===0; // synthetic visuals only when official department count is zero
  if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();
  openModal('6P·MIRAE 실적 현황 · 기간 비교',
   '<div class="form-grid" id="acad-viz-filters">'+
    '<label>시작 월<input id="acad-viz-from" type="month" value="'+esc(initial.filters.from)+'"></label>'+
    '<label>종료 월<input id="acad-viz-to" type="month" value="'+esc(initial.filters.to)+'"></label>'+
    '<label>기간 묶음<select id="acad-viz-group"><option value="month">월별</option>'+
     '<option value="semester">학기별</option></select></label></div>'+
   '<div class="inline-btns chart-toolbar"><button class="btn primary" id="acad-viz-apply" type="button">기간 비교</button>'+
    '<button class="btn" id="acad-viz-toggle" type="button" aria-pressed="false">별도 시연 예시 보기</button>'+
    '<a class="btn" id="acad-viz-print" target="_blank" rel="noopener noreferrer">인쇄/PDF</a></div>'+
   '<div id="acad-viz-output" aria-live="polite">조회 중...</div>');
  document.querySelector('#modal').classList.add('academic-viz');
  const container=document.querySelector('#modal-body');
  const f=id=>container.querySelector('#'+id);
  const params=()=>new URLSearchParams({from:f('acad-viz-from').value,to:f('acad-viz-to').value,
   group_by:f('acad-viz-group').value});
  const showProof=(data,type,key,period)=>{
   const root=f('acad-proof-output');
   if(!root)return;
   const category=type==='mirae'?'MIRAE '+key:'6P '+key;
   let rows=(data.evidence||[]).filter(x=>type==='mirae'?
    (x.mirae_codes||[]).includes(key):x.phase===key);
   if(period)rows=rows.filter(a=>{
    const month=a.activity_day.slice(0,7);
    return month>=period.month_start&&month<=period.month_end;
   });
   const label=category+(period?' · '+period.label:'')+' 인정 근거';
   root.innerHTML='<h4>'+esc(label)+'</h4>'+
    (rows.length?table(['활동일','학생','활동명','단계','연계 영역'],
     rows.map(a=>[esc(a.activity_day),esc(a.student_name),esc(a.title),
      esc(a.phase||'미연계'),esc((a.mirae_codes||[]).join(', ')||'미연계')])):
     '<p class="chart-proof-empty">해당 조건에 부서 인정 활동이 없습니다.</p>')+
    (data.sample?'<p class="micro">※ 이 활동들은 가상 시연 예시로 실제 인정 실적이나 증빙이 아닙니다.</p>':
     '<p class="micro">부서가 인정 처리한 활동만 표시합니다. 상세 제출본은 학생별 월별 보고서에서 확인합니다.</p>');
  };
  const render=async()=>{
   try{
    const p=params();
    const actual=await api(base+'?'+p.toString());
    const data=sample?sampleVisualization(actual):actual;
    const isEmpty=data.current.unique_activities===0;
    const phases=data.phase_codes.filter(k=>['P3','P4','P5','P6'].includes(k)).map(k=>({
     code:k,label:k,value:data.current.phases[k]}));
    const competences=data.competencies.map(k=>({
     code:k.code,label:k.code+' · '+k.label,value:data.current.competencies[k.code]}));
    const keys=data.competencies.map(c=>c.code);
    const tabular=data.series.map(period=>[
     esc(period.label),period.unique_activities+'건',
     ...keys.map(k=>period.competencies[k]+'건'),
     ...data.phase_codes.map(k=>period.phases[k]+'건')
    ]);
    f('acad-viz-toggle').textContent=sample?'공식 집계로 돌아가기':'별도 시연 예시 보기';
    f('acad-viz-toggle').setAttribute('aria-pressed',String(sample));
    const print=f('acad-viz-print');
    if(sample){print.href='#';print.removeAttribute('aria-disabled');print.classList.remove('chart-print-disabled');print.textContent='가상 예시 인쇄/PDF';}
    else{print.href=origin+base+'/print?'+p.toString();print.removeAttribute('aria-disabled');print.classList.remove('chart-print-disabled');print.textContent='공식 결과 인쇄/PDF';}
    disposeCharts(f('acad-viz-output'));
    const ready=data.readiness||{};
    const summary=sample?
     '<div class="chart-sample-warning" role="status"><b>가상 시연 전용 예시</b> · 실제 학생 데이터/부서 공식 인정 아님 · 서버 DB에 저장되지 않음. 40명·120건의 예시로 차트와 탐색 기능을 확인합니다.</div>':
     '<div class="chart-readiness"><b>공식 인정 실적 '+data.current.unique_activities+'건</b>'+
      ' · 활동 등록 '+(ready.entered_activities??0)+'건'+
      ' · 교수 확인 완료 보고서 '+(ready.reviewed_reports??0)+'건'+
      ' · 부서 인정 처리 '+(ready.recognized_decisions??0)+'건'+
      (Number(ready.legacy_demo_achievements)>0?
       '<p>기존 가상 성과 '+ready.legacy_demo_achievements+'건은 공식 이수 실적으로 자동 합산하지 않습니다.</p>':'')+
     '</div>';
    const noData=isEmpty?'<div class="chart-empty-summary"><b>부서 인정 실적 없음</b>'+
     '<p>활동 등록 → 월별 보고서 제출 → 멘토·지도교수 확인 → 부서 인정 → 6P·MIRAE 연계가 이루어지면 그래프가 표시됩니다. 시각화 방법은 위의 ‘별도 시연 예시 보기’에서 확인할 수 있습니다.</p></div>':'';
    f('acad-viz-output').innerHTML=summary+noData+
     '<p class="sub">현재 인정 활동 '+data.current.unique_activities+'건 · 선택 기간 '+data.selected_period.unique_activities+
      '건. 하나의 활동이 여러 MIRAE 영역에 연결될 수 있으므로 영역별 합계를 총 활동 수로 해석하지 않습니다.</p>'+
     '<div class="research-chart-grid">'+
      '<section class="research-chart-card"><h3>MIRAE 5개 영역 · 인정 활동</h3>'+
       '<p class="chart-note">영역별 독립 건수 · 막대 또는 아래 영역을 누르면 근거 확인</p>'+
       '<div id="acad-mirae-bars" class="research-chart chart-bars" role="img" aria-label="MIRAE 영역별 인정 활동"></div></section>'+
      '<section class="research-chart-card"><h3>6P 단계별 실적</h3>'+
       '<p class="chart-note">P3~P6 · P1/P2는 연구실 배치·초기 계획 증빙으로 별도 확인</p>'+
       '<div id="acad-phase-bars" class="research-chart chart-bars" role="img" aria-label="P3~P6 인정 실적"></div></section>'+
     '</div>'+
     '<section class="research-chart-card"><h3>선택 기간의 '+(data.filters.group_by==='month'?'월별':'학기별')+
      ' MIRAE 인정 건수 추이</h3><div id="acad-trend" class="research-chart chart-trend" role="img" aria-label="학기별 MIRAE 추이"></div></section>'+
     '<section class="research-chart-card"><h3>기간 × MIRAE 영역 히트맵</h3>'+
      '<p class="chart-note">진한 색일수록 인정 활동이 많은 기간입니다. 셀을 선택하면 해당 기간 근거가 표시됩니다.</p>'+
      '<div id="acad-period-heatmap" class="research-chart chart-period-heatmap" role="img" aria-label="기간별 MIRAE 인정 실적 히트맵"></div></section>'+
     '<section class="research-chart-card chart-evidence" aria-label="인정 근거 탐색">'+
      '<h3>인정 근거 확인</h3>'+
      '<div id="acad-proof-actions" class="chart-proof-actions">'+
       ['M','I','R','A','E'].map(code=>'<button class="btn" type="button" data-evidence-type="mirae" data-code="'+code+'">'+code+'</button>').join('')+
       ['P3','P4','P5','P6'].map(code=>'<button class="btn" type="button" data-evidence-type="phase" data-code="'+code+'">'+code+'</button>').join('')+
      '</div><div id="acad-proof-output" aria-live="polite"><p class="micro">영역·단계·히트맵을 선택하면 해당 인정 활동을 확인할 수 있습니다.</p></div></section>'+
     panel('기간별 MIRAE·6P 비교 도표',
      table(['기간','인정 활동',...data.competencies.map(x=>x.code),
       ...data.phase_codes],tabular))+
     '<p class="micro">'+data.notes.map(esc).join(' ')+'</p>';
    f('acad-proof-actions').querySelectorAll('[data-evidence-type]').forEach(el=>
     el.addEventListener('click',()=>showProof(data,el.dataset.evidenceType,el.dataset.code)));
    await loadECharts();
    renderHorizontal('acad-mirae-bars',competences,
     {onSelect:item=>showProof(data,'mirae',item.code)});
    if(progress&&!sample){
     const stages=progress.stages.filter(x=>['P3','P4','P5','P6'].includes(x.phase)).map(x=>({
      phase:x.phase,recognized:Object.values(x.counted).reduce((n,v)=>n+Number(v||0),0),
      missing:Object.values(x.missing).reduce((n,v)=>n+Number(v||0),0)}));
     renderPhaseProgress('acad-phase-bars',stages,
      {onSelect:item=>showProof(data,'phase',item.phase)});
    }else renderHorizontal('acad-phase-bars',phases,
     {onSelect:item=>showProof(data,'phase',item.code)});
    renderMiraeTrend('acad-trend',data.series,data.competencies);
    renderPeriodHeatmap('acad-period-heatmap',data.series,data.competencies,{
     onSelect:({code,period})=>showProof(data,'mirae',code,period)
    });
   }catch(e){toast('시각화 오류: '+e.message);}
  };
  f('acad-viz-print').addEventListener('click',event=>{
    if(!sample)return;
    event.preventDefault();
    const popup=window.open('','_blank');
    if(!popup){toast('인쇄 창을 허용해 주세요.');return;}
    const output=f('acad-viz-output');
    const svgs=Array.from(output.querySelectorAll('svg')).map(n=>'<div class="plot">'+n.outerHTML+'</div>').join('');
    const tables=Array.from(output.querySelectorAll('table')).map(n=>n.outerHTML).join('');
    const title='연세대학교 미래캠퍼스 6P·MIRAE 가상 시연 보고서';
    const style='@page{size:A4 landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#172c40;margin:0}h1{font-size:19px}.notice{padding:10px;background:#fff3d9;border:1px solid #e6bc65;font-weight:bold}.plots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.plot{border:1px solid #dce5ee;padding:8px;break-inside:avoid}.plot svg{width:100%!important;height:185px!important}table{border-collapse:collapse;width:100%;font-size:9px;margin:12px 0}td,th{border:1px solid #ccd8e2;padding:5px}';
    popup.document.open();
    popup.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'+title+'</title><style>'+style+'</style></head><body><h1>'+title+'</h1><p class="notice">가상 시연 자료 · 학생 40명 / 활동 120건 · 실제 대학 실적 및 공식 증빙 아님</p><p>선택 기간: '+esc(f('acad-viz-from').value)+' ~ '+esc(f('acad-viz-to').value)+' · '+esc(f('acad-viz-group').selectedOptions[0].textContent)+'</p><div class="plots">'+svgs+'</div><h2>기간별 비교표</h2>'+tables+'</body></html>');
    popup.document.close();popup.focus();
   });
   f('acad-viz-apply').addEventListener('click',render);
  f('acad-viz-toggle').addEventListener('click',()=>{sample=!sample;render()});
  await render();
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
 async function monthlyAdminOverview(){
  const {items:users}=await api('/api/users');
  const professors=users.filter(x=>x.role==='professor');
  const option=(v,text)=>'<option value="'+v+'">'+esc(text)+'</option>';
  const form='<div class="form-grid" id="acad-overview-filters">'+
   '<label>학년도<input type="number" id="acad-year" value="2026" min="2020" max="2100"></label>'+
   '<label>학기<select id="acad-term"><option value="">전체 학기</option>'+
    option('1','1학기')+option('2','2학기')+'</select></label>'+
   '<label>기수<input id="acad-cohort" placeholder="전체 기수"></label>'+
   '<label>보고 대상 월<input type="month" id="acad-month"></label>'+
   '<label>담당 교수<select id="acad-prof"><option value="">전체 교수</option>'+
    professors.map(x=>option(x.id,x.name)).join('')+'</select></label>'+
   '<label>6P 근거 단계<select id="acad-phase"><option value="all">전체 단계</option>'+
    ['P1','P2','P3','P4','P5','P6'].map(x=>option(x,x)).join('')+'</select></label>'+
   '<label>보고서 상태<select id="acad-status">'+
    [['all','전체'],['not_submitted','미제출'],['draft','임시저장'],
     ['submitted','교수 검토 중'],['revision','보완 요청'],
     ['department_review','부서 심사 중']].map(([a,b])=>option(a,b)).join('')+
    '</select></label></div>'+
    '<div class="inline-btns"><button type="button" class="btn primary" id="acad-overview-search">조건 조회</button>'+
    '<button type="button" class="btn" id="acad-overview-download">CSV 다운로드</button></div>'+
    '<p class="sub">미제출은 선택 보고 월에 기록이 없는 학생입니다. 교수 확인·부서 실적 인정은 별도 상태로 구분합니다.</p>'+
    '<div id="acad-overview-result">조회 조건을 선택하세요.</div>';
  if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();
  openModal('담당 부서 현황 · 조회/추출',form);
  const container=document.querySelector('#modal-body');
  const find=id=>container.querySelector('#'+id);
  const query=()=>{
   const params=new URLSearchParams();
   for(const [id,key] of [['acad-year','year'],['acad-term','term'],['acad-cohort','cohort'],
    ['acad-month','month'],['acad-prof','professor_id'],['acad-phase','phase'],['acad-status','status']]){
    const value=find(id)?.value?.trim();
    if(value&&!(key==='phase'&&value==='all')&&!(key==='status'&&value==='all'))
     params.set(key,value);
   }
   return params.toString();
  };
  const run=async()=>{
   try{
    const result=await api('/api/academic-admin-overview?'+query());
    disposeCharts(find('acad-overview-result'));
    find('acad-overview-result').innerHTML=(result.items.length?panel('학생별 P3~P6 단계 현황',
     '<div id="acad-6p-matrix" class="research-chart chart-student-matrix" role="img" aria-label="학생별 P3~P6 단계 이수 상태"></div>',
     'P1·P2는 연구실 배치와 초기 계획 등 별도 증빙으로 확인합니다.'):'')+panel('조회 결과 · '+result.count+'명',
     table(['학생','학기·기수','보고 대상 월','보고서','멘토 / 지도','인정·미연계','6P 및 상세'],
      result.items.map(row=>[
       esc(row.name)+'<br><span class="micro">'+esc(row.username)+' · '+esc(row.department)+'</span>',
       row.year+'/'+row.term+' · '+esc(row.cohort),
       esc(row.report_month||'없음'),esc(row.report_status),
       esc(row.mentor_review)+' / '+esc(row.advisor_review),
       row.recognized+'건 / '+row.unmapped+'건',
       '<button class="link" onclick="app.monthlyProgress('+row.id+')">6P·MIRAE 근거 보기</button>'
      ]),'조건에 해당하는 학생이 없습니다.'));
    if(result.items.length){await loadECharts();renderPhaseHeatmap('acad-6p-matrix',result.items)}
   }catch(e){toast('현황 조회 실패: '+e.message);}
  };
  find('acad-overview-search').addEventListener('click',run);
  find('acad-overview-download').addEventListener('click',async()=>{
   try{
    const base=window.STUDENT_API_BASE||'',url=base+'/api/academic-admin-export.csv?'+query();
    const res=await fetch(url,{credentials:base?'include':'same-origin'});
    if(!res.ok)throw Error('조회 조건 확인 필요 ('+res.status+')');
    const blob=await res.blob(),objectUrl=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=objectUrl;a.download='student-department-overview.csv';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
    toast('현재 조건의 전체 부서 현황 CSV 저장');
   }catch(e){toast('추출 실패: '+e.message);}
  });
  await run();
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
   '<label>연구실 배치<input name="research_lab" maxlength="500" value="'+esc(p.research_lab||'')+'"></label>'+
   '<label>P1 확인 근거<input name="p1_evidence" maxlength="500" value="'+esc(p.p1_evidence||'')+'"></label>'+
   '<label>P2 초기 계획·사전활동 확인<select name="p2_status">'+
    ['pending','confirmed','revision'].map(v=>option(v,p.p2_status,v)).join('')+'</select></label>'+
   '<label>P2 확인 근거<input name="p2_evidence" maxlength="500" value="'+esc(p.p2_evidence||'')+'"></label>'+
   '<label>대학원 진학기관·진로<input name="postgraduate_destination" maxlength="500" value="'+esc(p.postgraduate_destination||'')+'"></label>'+
   '<label>대학원 진학 확인<select name="postgraduate_admission_status">'+
    [['pending','확인 전'],['not_applied','미지원'],['applied','지원'],['admitted','합격·진학'],['not_admitted','불합격']].map(([v,t])=>option(v,p.postgraduate_admission_status||'pending',t)).join('')+
    '</select></label>'+
   '<label>학적(재학·졸업·수료) 상태<select name="graduation_status">'+opts([
    ['pending','확인 전'],['enrolled','재학'],['graduated','졸업'],['completed','수료']])+
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
 async function monthlyEditMiraeCatalog(){
  const r=await api('/api/academic-mirae-catalog'),codes=['M','I','R','A','E'];
  const rows=codes.map(code=>{
   const x=r.items[code];
   return '<fieldset style="border:1px solid #dae4eb;border-radius:8px;padding:12px"><legend>'+
    code+' · '+esc(x.name)+'</legend><div class="form-grid">'+
    '<label>한글 명칭<input name="'+code+'.name" maxlength="100" value="'+esc(x.name)+'" required></label>'+
    '<label>영문 명칭<input name="'+code+'.english" maxlength="100" value="'+esc(x.english)+'" required></label>'+
    '<label class="full">발주기관 확정 정의<textarea name="'+code+'.definition" maxlength="1200">'+
     esc(x.definition)+'</textarea></label></div></fieldset>';
  }).join('');
  openModal('MIRAE 5개 영역 · 기관 확정 기준 편집',
   '<form><div class="form-grid"><label>학년도<input name="year" type="number" min="2020" max="2100" value="2026" required></label>'+
    '<label>학기<select name="term"><option value="1">1학기</option><option value="2" selected>2학기</option></select></label>'+
    '<label>기수<input name="cohort" maxlength="50" value="all" required></label></div>'+
    '<p class="sub">현재 표시는 잠정 명칭입니다. 공식 문서 확인 후 담당 부서가 명칭·정의를 확정해야 합니다.</p>'+
    rows+'<label>변경 근거·승인 내역<textarea name="reason" maxlength="600" required></textarea></label>'+formActions,
    async f=>{
     const items={};
     for(const code of codes)items[code]={name:f.get(code+'.name'),english:f.get(code+'.english'),
      definition:f.get(code+'.definition')};
     await api('/api/academic-mirae-catalog',{method:'PUT',body:JSON.stringify({
      year:Number(f.get('year')),term:Number(f.get('term')),cohort:f.get('cohort'),
      reason:f.get('reason'),items})});
     toast('MIRAE 명칭·정의와 변경 이력을 저장했습니다.');
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

 async function newFinalReport(){
  const {items}=await api('/api/plans');
  if(!items.length){toast('활동계획을 먼저 등록하세요.');return;}
  const pick=items.map(x=>'<option value="'+x.id+'">'+esc(x.title)+'</option>').join('');
  openModal('최종 연구결과보고서 작성','<form><label>활동계획<select name="plan_id">'+pick+'</select></label>'+
   '<label>보고서 제목<input name="title" maxlength="160" required></label>'+
   '<label>수행내용<textarea name="execution_content" maxlength="8000" required></textarea></label>'+
   '<label>주요 성과<textarea name="outcomes" maxlength="6000" required></textarea></label>'+
   '<label>향후 계획<textarea name="future_plan" maxlength="4000" required></textarea></label>'+
   '<p class="micro">발주기관 공식 제공 서식의 세부 항목은 별도로 대조해야 합니다.</p>'+formActions,
   async f=>{const b=Object.fromEntries(f);b.plan_id=Number(b.plan_id);
    await api('/api/final-reports',dataBody(b));toast('최종 보고서 초안이 저장되었습니다.');});
 }
 async function editFinalReport(id){
  const r=await api('/api/final-reports/'+id);
  openModal('최종 연구결과보고서 수정','<form>'+
   '<label>제목<input name="title" maxlength="160" value="'+esc(r.title)+'" required></label>'+
   '<label>수행내용<textarea name="execution_content" maxlength="8000" required>'+esc(r.execution_content)+'</textarea></label>'+
   '<label>성과<textarea name="outcomes" maxlength="6000" required>'+esc(r.outcomes)+'</textarea></label>'+
   '<label>향후 계획<textarea name="future_plan" maxlength="4000" required>'+esc(r.future_plan)+'</textarea></label>'+formActions,
   async f=>{await api('/api/final-reports/'+id,{method:'PATCH',body:JSON.stringify(Object.fromEntries(f))});
    toast('최종보고서가 수정됐습니다.');});
 }
 async function submitFinalReport(id){
  if(!confirm('최종 연구결과보고서를 두 교수에게 제출하고 제출본을 잠글까요?'))return;
  try{await api('/api/final-reports/'+id+'/submit',dataBody({}));
   toast('최종보고서 제출본을 저장하고 두 교수에게 전달했습니다.');await loadView();}
  catch(e){toast('최종보고서 제출 오류: '+e.message);}
 }
 async function finalReportDetail(id){
  const r=await api('/api/final-reports/'+id);
  const revisions=r.versions.map(v=>'<tr><td>'+v.revision+'차</td><td>'+esc(v.submitted_at)+
   '</td><td><b>수행내용</b> '+esc(v.snapshot.execution_content)+
   '<p><b>성과</b> '+esc(v.snapshot.outcomes)+'</p><p><b>향후 계획</b> '+
   esc(v.snapshot.future_plan)+'</p></td></tr>').join('');
  const reviews=r.reviews.map(v=>[esc(v.revision+'차'),esc(v.reviewer_role),
   esc(v.decision),esc(v.feedback),esc(v.reviewed_at)]);
  openModal('최종보고서 · 제출본 및 교수 확인 이력',
   '<p><b>'+esc(r.title)+'</b> · '+esc(r.status)+'</p>'+
   panel('현재 수행내용·성과·계획','<p>'+esc(r.execution_content)+'</p><p>'+esc(r.outcomes)+'</p><p>'+esc(r.future_plan)+'</p>')+
   panel('교수별 확인 이력',table(['차수','담당','처리','의견','시각'],reviews))+
   '<h3>이전 제출본 원문</h3><div class="table-scroll"><table class="data-table"><thead><tr><th>차수</th><th>제출일</th><th>당시 원문</th></tr></thead><tbody>'+
   revisions+'</tbody></table></div>');
 }
 async function reviewFinalReport(id,decision){
  openModal(decision==='revision'?'최종보고서 보완 요청':'최종보고서 확인',
   '<form><label>교수 의견<textarea name="feedback" maxlength="1000" '+(decision==='revision'?'required':'')+'></textarea></label>'+formActions,
   async f=>{await api('/api/final-reports/'+id+'/review',dataBody({decision,feedback:f.get('feedback')}));
    toast('최종보고서 독립 교수 검토 이력이 저장됐습니다.');});
 }
 return {page,actions:{newFinalReport,editFinalReport,submitFinalReport,finalReportDetail,reviewFinalReport,newMonthlyActivity,newMonthlyReport,editMonthlyReport,submitMonthlyReport,
  reviewMonthlyReport,monthlyDetail,monthlyAddEvidence,monthlyDeleteEvidence,monthlyRecognition,monthlyProgress,monthlyExportProgress,
  monthlyChooseStudent,monthlyAdminOverview,monthlyVisualize,monthlyEditProfile,monthlyEditCriteria,monthlyEditMiraeCatalog,monthlyMapActivity,monthlyDecideStage,monthlyAssignReviewers}};
}
