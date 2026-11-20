// University-facing presentation layer. Official recognition always comes from the API.
// Apache ECharts 5.6.0 (Apache-2.0) is distributed locally at /vendor/echarts-5.6.0.min.js.
// No calculated score, mocked activity, or remote CDN is used here.
const COLORS={blue:'#236B95',teal:'#138A7D',amber:'#DA9C40',rose:'#D56E73',
  purple:'#8661AC',gray:'#AAB9CA',pale:'#EEF2F6'};
const SERIES=[COLORS.blue,COLORS.teal,COLORS.amber,COLORS.purple,COLORS.rose,COLORS.gray];
const ECHARTS_SRC='/vendor/echarts-5.6.0.min.js';
let loadPromise=null;
export function loadECharts(){
 if(window.echarts?.init)return Promise.resolve(true);
 if(loadPromise)return loadPromise;
 loadPromise=new Promise(resolve=>{
  const script=document.createElement('script');
  script.src=ECHARTS_SRC;script.async=true;
  script.onload=()=>resolve(Boolean(window.echarts?.init));
  script.onerror=()=>{loadPromise=null;resolve(false)};
  document.head.append(script);
 });
 return loadPromise;
}
const charts=new Map();
let resizeBound=false;
function base(){
 return {color:SERIES,animationDuration:250,animationDurationUpdate:180,
  textStyle:{fontFamily:'Pretendard,Inter,system-ui,sans-serif',fontSize:12,color:'#23354B'},
  aria:{enabled:true,description:'부서 인정 실적과 학생 업무 기록을 표시한 차트'},
  tooltip:{trigger:'item',renderMode:'richText',backgroundColor:'#19334D',borderWidth:0,
   textStyle:{color:'#fff',fontSize:12}},
  toolbox:{show:false}};
}
function mount(id,option,alt){
 const host=document.getElementById(id);
 if(!host)return false;
 const ec=window.echarts;
 if(!ec||typeof ec.init!=='function'){
  host.innerHTML='<p class="chart-fallback">'+alt+' · 수치는 아래 표에서 확인할 수 있습니다.</p>';
  return false;
 }
 const old=charts.get(id);
 if(old){try{old.dispose()}catch{} charts.delete(id)}
 host.innerHTML='';
 const chart=ec.init(host,null,{renderer:'svg',devicePixelRatio:1});
 chart.setOption({...base(),...option},true);
 charts.set(id,chart);
 if(!resizeBound){
  window.addEventListener('resize',()=>{for(const chart of charts.values())if(!chart.isDisposed())chart.resize()}, {passive:true});
  resizeBound=true;
 }
 return true;
}
export function disposeCharts(root=document){
 for(const [id,chart] of charts){
  if(!root.contains(document.getElementById(id)))continue;
  chart.dispose();charts.delete(id);
 }
}
// Honest no-data SVG. An empty metric is not a 100%-filled gray bar.
export function renderEmptyMetric(id,{title='인정 실적 없음',detail='부서 인정 후 그래프가 표시됩니다.'}={}){
 return mount(id,{graphic:[
  {type:'rect',left:'7%',top:'13%',shape:{width:1,height:1},style:{fill:'transparent'}},
  {type:'text',left:'center',top:'36%',style:{text:title,fill:'#344d68',font:'700 22px Pretendard, system-ui',textAlign:'center'}},
  {type:'text',left:'center',top:'53%',style:{text:detail,fill:'#758aa0',font:'12px Pretendard, system-ui',textAlign:'center'}}],
  xAxis:{show:false},yAxis:{show:false},series:[]},title);
}
export function renderHorizontal(id,items,{unit='건',mode='count',onSelect}={}){
 const data=items.map(i=>Number(i.value)||0);
 if(data.every(v=>v<=0))return renderEmptyMetric(id);
 const max=Math.max(1,...data);
 const option={
  grid:{top:12,bottom:22,left:12,right:64,containLabel:true},
  xAxis:{type:'value',min:0,minInterval:1,max:mode==='percent'?100:Math.max(1,Math.ceil(max*1.14)),
   splitLine:{lineStyle:{color:'#ecf1f6',type:'dashed'}},axisLabel:{color:'#91a0b1'}},
  yAxis:{type:'category',inverse:true,data:items.map(i=>i.label),
   axisLabel:{color:'#3b5571',width:180,overflow:'truncate',fontSize:12,fontWeight:600},
   axisLine:{show:false},axisTick:{show:false}},
  tooltip:{trigger:'axis',axisPointer:{type:'shadow'},renderMode:'richText',
   valueFormatter:v=>v+unit},
  series:[{
   name:'부서 인정',type:'bar',barWidth:19,data,
   itemStyle:{borderRadius:[0,10,10,0],color:p=>new window.echarts.graphic.LinearGradient(0,0,1,0,[
    {offset:0,color:SERIES[p.dataIndex%5]},{offset:1,color:['#73BFC2','#91ACD7','#E9BC80','#B6A0D7','#ECA3A8'][p.dataIndex%5]}])},
   emphasis:{focus:'series'},label:{show:true,position:'right',distance:9,color:'#253950',
    fontSize:13,fontWeight:700,formatter:p=>p.value+unit}
  },{
   name:'인정 활동',type:'scatter',symbolSize:14,silent:true,z:3,
   data:items.map((item,i)=>[data[i],item.label]),
   itemStyle:{color:'#fff',borderColor:COLORS.teal,borderWidth:3}
  }]
 };
 const mounted=mount(id,option,'영역별 인정 건수');
 if(mounted&&typeof onSelect==='function'){
  const chart=charts.get(id);
  chart.on('click',e=>{const index=e.dataIndex;if(Number.isInteger(index)&&items[index])onSelect(items[index]);});
 }
 return mounted;
}
export function renderPhaseProgress(id,stages,{onSelect}={}){
 const names=stages.map(x=>x.phase),accepted=stages.map(x=>x.recognized),
  missing=stages.map(x=>x.missing);
 if(accepted.every(v=>!v)&&missing.every(v=>!v))return renderEmptyMetric(id);
 const mounted=mount(id,{
  legend:{top:0,right:12,data:['인정','부족'],textStyle:{fontSize:11,color:'#5A6D83'}},
  grid:{left:30,right:30,top:48,bottom:18,containLabel:true},
  xAxis:{type:'value',min:0,minInterval:1,splitLine:{lineStyle:{color:'#E8EEF4'}}},
  yAxis:{type:'category',inverse:true,data:names,axisLine:{show:false},axisTick:{show:false}},
  tooltip:{trigger:'axis',axisPointer:{type:'shadow'},renderMode:'richText',
   valueFormatter:v=>v+'건'},
  series:[
   {name:'인정',type:'bar',stack:'required',barMaxWidth:25,data:accepted,itemStyle:{color:COLORS.teal,borderRadius:[4,0,0,4]},label:{show:true,position:'inside',color:'#fff',formatter:p=>p.value?p.value:''}},
   {name:'부족',type:'bar',stack:'required',barMaxWidth:25,data:missing,itemStyle:{color:COLORS.amber,borderRadius:[0,4,4,0]},label:{show:true,position:'inside',color:'#263A4F',formatter:p=>p.value?p.value:''}}
  ]
 },'6P 이수 인정·부족 현황');
 if(mounted&&typeof onSelect==='function'){
  charts.get(id).on('click',e=>{
   const row=stages[e.dataIndex];
   if(row)onSelect(row);
  });
 }
 return mounted;
}
export function renderMiraeTrend(id,periods,competencies){
 const names=periods.map(x=>x.label);
 if(!periods.length||periods.every(p=>competencies.every(c=>!(Number(p.competencies?.[c.code])>0))))
  return renderEmptyMetric(id,{title:'선택 기간 실적 없음',detail:'월·학기별 인정 활동이 등록되면 추이가 표시됩니다.'});
 return mount(id,{
  legend:{type:'scroll',top:5,left:9,itemWidth:10,itemHeight:10,textStyle:{fontSize:11}},
  grid:{top:52,bottom:48,left:42,right:18},
  tooltip:{trigger:'axis',renderMode:'richText',valueFormatter:v=>v+'건'},
  xAxis:{type:'category',boundaryGap:false,data:names,axisLabel:{fontSize:10,color:'#6A7B8F',hideOverlap:true},
   axisLine:{lineStyle:{color:'#DFE7EF'}}},
  yAxis:{type:'value',min:0,minInterval:1,axisLabel:{color:'#8190A3'},splitLine:{lineStyle:{color:'#E9EFF4'}}},
  dataZoom:periods.length>12?[{type:'inside',start:0,end:100}]:[],
  series:competencies.map((c,i)=>({
   name:c.label||c.code,type:'line',smooth:0.16,showSymbol:periods.length<=12,
   symbolSize:6,lineStyle:{width:2.5},emphasis:{focus:'series'},
   areaStyle:{opacity:0.09},data:periods.map(x=>Number(x.competencies[c.code])||0)}))
 },'기간별 MIRAE 인정 실적');
}
export function renderPeriodHeatmap(id,periods,competencies,{onSelect}={}){
 if(!periods.length||!periods.some(p=>competencies.some(c=>Number(p.competencies?.[c.code])>0)))
  return renderEmptyMetric(id,{title:'기간별 실적 없음',detail:'인정 활동이 발생한 기간에 분포가 표시됩니다.'});
 const codes=competencies.map(c=>c.code),labels=periods.map(p=>p.label);
 const values=[];
 for(let y=0;y<codes.length;y++)for(let x=0;x<periods.length;x++)
  values.push([x,y,Number(periods[x].competencies[codes[y]])||0]);
 const max=Math.max(1,...values.map(x=>x[2]));
 const mounted=mount(id,{
  grid:{left:132,right:23,top:18,bottom:72,containLabel:false},
  tooltip:{trigger:'item',renderMode:'richText',
   formatter:p=>labels[p.value[0]]+' · '+competencies[p.value[1]].label+' · '+p.value[2]+'건'},
  xAxis:{type:'category',data:labels,axisTick:{show:false},axisLine:{show:false},
   axisLabel:{fontSize:10,color:'#65798E',rotate:labels.length>=9?32:0,hideOverlap:true}},
  yAxis:{type:'category',inverse:true,data:competencies.map(c=>c.code+' · '+c.label),
   axisLine:{show:false},axisTick:{show:false},axisLabel:{color:'#344B67',fontWeight:600,width:115,overflow:'truncate'}},
  visualMap:{min:0,max,dimension:2,orient:'horizontal',left:'center',bottom:4,itemWidth:14,itemHeight:102,
   text:['많음','없음'],textGap:9,calculable:false,textStyle:{color:'#65798E',fontSize:10},
   inRange:{color:['#F1F6F9','#B3DBDA','#63B6AA','#226D85']}},
  series:[{name:'기간별 인정',type:'heatmap',data:values,progressive:0,
   label:{show:periods.length<=10,formatter:p=>p.value[2]||'',color:'#173D52',fontSize:10},
   itemStyle:{borderWidth:3,borderColor:'#fff',borderRadius:7},
   emphasis:{itemStyle:{borderColor:'#173D52',borderWidth:2}}}]
 },'MIRAE 영역별 기간 히트맵');
 if(mounted&&typeof onSelect==='function')
  charts.get(id).on('click',e=>{
   const row=e.value;
   if(Array.isArray(row))onSelect({code:codes[row[1]],period:periods[row[0]]});
  });
 return mounted;
}
export function renderPlanStatus(id,counts){
 const names=[['approved','승인 완료'],['submitted','검토 대기'],['revision','보완 요청'],
   ['draft','작성 중'],['rejected','반려']];
 const data=names.map(([k,n],i)=>({name:n,value:Number(counts[k])||0,itemStyle:{color:SERIES[i]}}));
 const total=data.reduce((n,x)=>n+x.value,0);
 return mount(id,{
  tooltip:{trigger:'item',renderMode:'richText',valueFormatter:v=>v+'건'},
  legend:{type:'scroll',orient:'vertical',right:5,top:'middle',itemWidth:10,itemHeight:10,
   textStyle:{fontSize:11}},
  series:[{type:'pie',center:['32%','49%'],radius:['55%','74%'],
   minAngle:total?0:0,avoidLabelOverlap:true,label:{show:false},
   emphasis:{scaleSize:5},data:total?data:[{name:'등록된 계획 없음',value:1,itemStyle:{color:'#E7EDF3'}}]}],
  graphic:[{type:'text',left:'32%',top:'43%',style:{text:total+'건',fontSize:23,
   fontWeight:700,fill:'#22364A',textAlign:'center'}}]
 },'활동계획 상태별 건수');
}
export function renderReviewStack(id,entries){
 const labels=entries.map(x=>x.name);
 return mount(id,{
  legend:{top:0,data:['확인','미확인','보완 요청'],textStyle:{fontSize:11}},
  grid:{top:43,bottom:18,left:18,right:18,containLabel:true},
  xAxis:{type:'value',min:0,minInterval:1,splitLine:{lineStyle:{color:'#E8EEF4'}}},
  yAxis:{type:'category',inverse:true,data:labels,axisLabel:{width:110,overflow:'truncate'}},
  tooltip:{trigger:'axis',axisPointer:{type:'shadow'},renderMode:'richText',valueFormatter:v=>v+'건'},
  series:[['확인','confirmed',COLORS.teal],['미확인','pending',COLORS.gray],
    ['보완 요청','revision',COLORS.amber]].map(([name,key,color])=>({
    name,type:'bar',stack:'review',barMaxWidth:28,data:entries.map(e=>e[key]||0),itemStyle:{color}
   }))
 },'교수별 월별보고서 확인 현황');
}
export function renderPhaseHeatmap(id,rows){
 const phases=['P3','P4','P5','P6'];
 // P1/P2 have different proof workflows; never declare those as incomplete.
 const labels=rows.map(r=>r.name);
 const types={'미충족':0,'기본충족':1,'확정':2};
 const data=[];
 for(let y=0;y<rows.length;y++){
  const s=rows[y].stage_summary||'';
  const entries=Object.fromEntries(s.split(' / ').map(t=>t.split(':')));
  for(let x=0;x<phases.length;x++)data.push([x,y,types[entries[phases[x]]]??-1]);
 }
 const h=Math.max(230,Math.min(1250,rows.length*21+90));
 const host=document.getElementById(id);if(host)host.style.height=h+'px';
 return mount(id,{
  grid:{top:12,bottom:47,left:138,right:18},
  xAxis:{type:'category',data:phases,position:'top',axisLine:{show:false},axisTick:{show:false},
   splitArea:{show:true},axisLabel:{color:'#54677B'}},
  yAxis:{type:'category',inverse:true,data:labels,axisLine:{show:false},axisTick:{show:false},
   axisLabel:{width:120,overflow:'truncate',fontSize:10}},
  visualMap:{type:'piecewise',min:-1,max:2,dimension:2,show:true,orient:'horizontal',left:'center',bottom:0,
   calculable:false,pieces:[{value:-1,label:'확인 대상',color:'#EEF1F4'},
    {value:0,label:'부족',color:'#F1C2A6'},{value:1,label:'기본 충족',color:'#A6D5D4'},
    {value:2,label:'부서 확정',color:'#2F847B'}]},
  tooltip:{trigger:'item',renderMode:'richText',formatter:p=>{
   const code=phases[p.value[0]],student=labels[p.value[1]],
     status=Object.keys(types).find(k=>types[k]===p.value[2])||'별도 확인';
   return student+' · '+code+' · '+status;}},
  series:[{type:'heatmap',data,itemStyle:{borderWidth:2,borderColor:'#fff',borderRadius:3},
   emphasis:{itemStyle:{borderColor:'#203D5A',borderWidth:2}}}]
 },'참여 학생의 P3~P6 단계별 인정상태');
}
export function renderMiraeMatrix(id,competencies){
 const times=[...new Set(competencies.flatMap(c=>c.monthly.map(p=>p.month)))].sort();
 const code=competencies.map(c=>c.code+' · '+c.label);
 const data=[];
 for(let y=0;y<competencies.length;y++){
  for(let x=0;x<times.length;x++){
   const hit=competencies[y].monthly.find(p=>p.month===times[x]);
   data.push([x,y,hit?.count||0]);
  }
 }
 if(!times.length){const host=document.getElementById(id);if(host)host.innerHTML='<p class="chart-fallback">부서 인정 실적이 없어 월별 비교값이 없습니다.</p>';return false}
 return mount(id,{
  grid:{left:145,right:21,top:12,bottom:55},
  xAxis:{type:'category',data:times,axisLabel:{rotate:times.length>8?35:0,color:'#5D7187'}},
  yAxis:{type:'category',inverse:true,data:code,axisLabel:{width:130,overflow:'truncate'}},
  tooltip:{renderMode:'richText',formatter:p=>code[p.value[1]]+' · '+times[p.value[0]]+' · '+p.value[2]+'건'},
  visualMap:{min:0,max:Math.max(1,...data.map(x=>x[2])),orient:'horizontal',show:true,
   left:'center',bottom:0,inRange:{color:['#F1F5F9','#A0CFCB',COLORS.teal]}},
  series:[{type:'heatmap',data,itemStyle:{borderColor:'#fff',borderWidth:2,borderRadius:3}}]
 },'월별 MIRAE 영역별 인정 건수');
}
