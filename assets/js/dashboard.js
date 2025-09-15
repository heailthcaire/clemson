/* Clemson AI Adoption Dashboard
   Data now loaded from external JSON file: assets/data/ai_dashboard_data.json
   Replace that file—no JS edits needed unless structure changes.
*/
const dashboardState = {
  period: 'Q',
  dept: 'ALL',
  range: 'LAST_4Q'
};

let DATA = null; // will hold fetched JSON
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
  fetchData().then(initDashboard).catch(showDataError);
});

async function fetchData(){
  const res = await fetch('assets/data/ai_dashboard_data.json', { cache: 'no-store' });
  if(!res.ok) throw new Error('Failed to load data file');
  return res.json();
}

function initDashboard(json){
  DATA = json;
  hideLoading();
  populateFilters();
  renderKpis();
  const vEl = document.getElementById('dataset-version');
if (vEl && DATA.datasetVersion) vEl.textContent = DATA.datasetVersion;

  buildAllVisuals();
  attachEvents();
}

function hideLoading(){
  document.getElementById('loading-state').classList.remove('active');
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('dashboard-panels').hidden = false;
}

function showDataError(err){
  console.error(err);
  document.getElementById('loading-state').classList.add('hidden');
  const e = document.getElementById('load-error');
  e.classList.remove('hidden');
}

/* -------- Utility Functions -------- */
function pct(part, total){ return total === 0 ? 0 : Math.round((part/total)*100); }
function completionPct(completed, total){ return pct(completed,total); }
function sumValues(obj){ return Object.values(obj).reduce((a,b)=>a+(typeof b==='number'?b:0),0); }
function avg(arr){ return arr.reduce((a,b)=>a+b,0)/arr.length; }
function computeTotalHoursSaved(processList){ return processList.reduce((a,p)=>a+p.hoursSaved,0); }
function computeTotalCostSaved(processList){ return processList.reduce((a,p)=>a+p.costSaved,0); }
function riskColor(score){ if(score<40) return 'green'; if(score<65) return 'yellow'; return 'red'; }
function gaugeColor(p){ if(p>=80) return '#2E8B57'; if(p>=55) return '#E6B800'; return '#D64545'; }

/* -------- Filters / Events -------- */
function populateFilters(){
  const deptSelect = document.getElementById('dept-filter');
  DATA.departments.forEach(d=>{
    const opt=document.createElement('option'); opt.value=d; opt.textContent=d; deptSelect.appendChild(opt);
  });
}

function attachEvents(){
  document.querySelectorAll('.period-toggle button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.period-toggle button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      dashboardState.period = btn.dataset.period;
      // Could re-render specific time-granular charts here if implemented
    });
  });

  document.getElementById('dept-filter').addEventListener('change', e=>{
    dashboardState.dept = e.target.value;
    updateProjectsByDept();
  });

  document.getElementById('range-filter').addEventListener('change', e=>{
    dashboardState.range = e.target.value;
    // Hook for timeframe logic if historical subsets needed
  });

  document.getElementById('export-dashboard').addEventListener('click', ()=>{
    alert('Export placeholder: implement html2canvas + jsPDF or server pipeline.');
  });
}

/* -------- KPIs -------- */
function renderKpis(){
  const projects = DATA.projectData;
  const activeProjects = projects.reduce((a,p)=> a + (p.initiated - p.completed),0);
  const totalInitiated = projects.reduce((a,p)=> a + p.initiated,0);
  const totalCompleted = projects.reduce((a,p)=> a + p.completed,0);
  document.getElementById('kpi-active-projects').textContent = activeProjects;
  document.getElementById('kpi-projects-complete-rate').textContent =
    `Completion: ${completionPct(totalCompleted,totalInitiated)}%`;

  const f = DATA.facultyAdoption;
  document.getElementById('kpi-faculty-adoption').textContent = pct(f.activeFaculty, f.totalFaculty) + '%';
  document.getElementById('kpi-faculty-active').textContent = `Active Users: ${f.activeFaculty}`;

  const s = DATA.studentEngagement;
  document.getElementById('kpi-student-engagement').textContent = pct(s.engagedStudents, s.totalStudents) + '%';
  document.getElementById('kpi-student-abs').textContent = `Participants: ${s.engagedStudents}`;

  const c = DATA.curriculum;
  document.getElementById('kpi-ai-courses').textContent = pct(c.aiCourses, c.totalCourses) + '%';
  document.getElementById('kpi-ai-course-count').textContent = `Courses: ${c.aiCourses}`;

  const hours = computeTotalHoursSaved(DATA.processes);
  const cost = computeTotalCostSaved(DATA.processes);
  document.getElementById('kpi-time-saved').textContent = hours + ' hrs';
  document.getElementById('kpi-cost-saved').textContent = '$' + (cost/1000).toFixed(1) + 'k';

  const roi = DATA.roiTrend.roiPct.at(-1);
  const value = DATA.roiTrend.valueCreated.at(-1);
  document.getElementById('kpi-roi').textContent = roi + '%';
  document.getElementById('kpi-value-created').textContent = '$' + value.toFixed(1) + 'M';
}

/* -------- Build All Visuals -------- */
function buildAllVisuals(){
  buildProjectBar();
  buildFacultyRadial();
  buildStudentLine();
  buildTrainingStacked();
  buildCoursesDoughnut();
  buildGrantsCombo();
  buildPublications();
  buildCollabHeatmap();
  buildSavingsBar();
  listProcesses();
  listServiceKpis();
  buildGovernanceGauge();
  buildEthicsDonut();
  buildIncidentLine();
  listRiskIndicators();
  buildAlignmentScorecard();
  buildBenchmarkRadar();
  buildRoiLine();
}

/* -------- Charts & Lists (adapted) -------- */
function buildProjectBar(){
  const ctx = document.getElementById('projectsBar');
  charts.projects = new Chart(ctx,{
    type:'bar',
    data:{
      labels: DATA.projectData.map(p=>p.dept),
      datasets:[
        { label:'Initiated', data: DATA.projectData.map(p=>p.initiated), backgroundColor:'rgba(246,103,51,0.7)' },
        { label:'Completed', data: DATA.projectData.map(p=>p.completed), backgroundColor:'rgba(82,45,128,0.7)' }
      ]
    },
    options:{
      responsive:true,
      plugins:{ legend:{ position:'bottom' } },
      scales:{ y:{ beginAtZero:true } }
    }
  });
  const tbody = document.getElementById('projects-fallback');
  DATA.projectData.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.dept}</td><td>${p.initiated}</td><td>${p.completed}</td>`;
    tbody.appendChild(tr);
  });
}

function updateProjectsByDept(){
  const chart = charts.projects;
  const labelSpan = document.getElementById('proj-dept-label');
  if(dashboardState.dept==='ALL'){
    chart.data.labels = DATA.projectData.map(p=>p.dept);
    chart.data.datasets[0].data = DATA.projectData.map(p=>p.initiated);
    chart.data.datasets[1].data = DATA.projectData.map(p=>p.completed);
    labelSpan.textContent='(All)';
  } else {
    const d = DATA.projectData.find(p=>p.dept===dashboardState.dept);
    chart.data.labels=[d.dept];
    chart.data.datasets[0].data=[d.initiated];
    chart.data.datasets[1].data=[d.completed];
    labelSpan.textContent='('+d.dept+')';
  }
  chart.update();
}

function buildFacultyRadial(){
  const f = DATA.facultyAdoption;
  const percent = pct(f.activeFaculty, f.totalFaculty);
  new Chart(document.getElementById('facultyRadial'),{
    type:'doughnut',
    data:{ labels:['Active','Remaining'], datasets:[{ data:[percent,100-percent], backgroundColor:['#F66733','#d9d3e9'], borderWidth:0, cutout:'75%' }]},
    options:{ plugins:{ legend:{ display:false } } }
  });
  const ul = document.getElementById('faculty-breakdown');
  f.distribution.forEach(item=>{
    const li=document.createElement('li');
    li.innerHTML=`<span>${item.tool}</span><span>${item.users}</span>`;
    ul.appendChild(li);
  });
}

function buildStudentLine(){
  const s = DATA.studentEngagement;
  new Chart(document.getElementById('studentLine'),{
    type:'line',
    data:{ labels:s.labelsM, datasets:[{ label:'% Engaged', data:s.valuesM, borderColor:'#522D80', backgroundColor:'rgba(82,45,128,0.15)', tension:.3, fill:true, pointRadius:2 }]},
    options:{ plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, max:100 } } }
  });
}

function buildTrainingStacked(){
  const t = DATA.trainingParticipation;
  new Chart(document.getElementById('trainingStacked'),{
    type:'bar',
    data:{ labels:t.labels, datasets:[
      { label:'Workshops', data:t.workshops, backgroundColor:'#F66733' },
      { label:'Certifications', data:t.certifications, backgroundColor:'#522D80' },
      { label:'Seminars', data:t.seminars, backgroundColor:'#2E8B57' }
    ]},
    options:{ plugins:{ legend:{ position:'bottom' } }, scales:{ x:{ stacked:true }, y:{ stacked:true, beginAtZero:true } } }
  });
}

function buildCoursesDoughnut(){
  const c = DATA.curriculum;
  new Chart(document.getElementById('coursesDoughnut'),{
    type:'doughnut',
    data:{ labels:['AI Integrated','Other Courses'], datasets:[{ data:[c.aiCourses, c.totalCourses-c.aiCourses], backgroundColor:['#522D80','#d6d1e5'], borderWidth:0, cutout:'65%' }]},
    options:{ plugins:{ legend:{ display:false } } }
  });
  const delta = c.aiCourses - c.prevYear;
  const growthPct = pct(delta, c.prevYear);
  document.getElementById('courses-context').textContent = `+${growthPct}% YoY growth in AI-integrated courses (Δ ${delta}).`;
}

function buildGrantsCombo(){
  const r = DATA.research;
  new Chart(document.getElementById('grantsCombo'),{
    type:'bar',
    data:{ labels:r.labels, datasets:[
      { type:'bar', label:'Amount ($M)', data:r.grantAmounts, backgroundColor:'rgba(246,103,51,0.65)', yAxisID:'y' },
      { type:'line', label:'Grant Count', data:r.grantCounts, borderColor:'#522D80', backgroundColor:'#522D80', tension:.3, yAxisID:'y1' }
    ]},
    options:{ interaction:{ mode:'index', intersect:false }, plugins:{ legend:{ position:'bottom' } },
      scales:{ y:{ beginAtZero:true }, y1:{ beginAtZero:true, position:'right', grid:{ drawOnChartArea:false } } }
    }
  });
}

function buildPublications(){
  const p = DATA.publications;
  new Chart(document.getElementById('pubsLine'),{
    type:'line',
    data:{ labels:p.labels, datasets:[
      { label:'Publications', data:p.pubs, borderColor:'#F66733', backgroundColor:'rgba(246,103,51,0.15)', tension:.3, fill:true },
      { label:'Citations', data:p.citations, borderColor:'#522D80', backgroundColor:'rgba(82,45,128,0.15)', tension:.3, fill:true }
    ]},
    options:{ plugins:{ legend:{ position:'bottom' } }, scales:{ y:{ beginAtZero:true } } }
  });
}

function buildCollabHeatmap(){
  const container = document.getElementById('collab-heatmap');
  const matrix = DATA.collabMatrix;
  const flat = matrix.flat();
  const max = Math.max(...flat);
  matrix.forEach((row,i)=>{
    row.forEach((val,j)=>{
      const cell=document.createElement('div');
      cell.className='cell';
      const intensity = max ? val/max : 0;
      cell.style.background = heatColor(intensity);
      cell.title = `${DATA.departments[i]} ↔ ${DATA.departments[j]}: ${val}`;
      cell.setAttribute('role','cell');
      cell.textContent = val===0 ? '' : val;
      container.appendChild(cell);
    });
  });
}
function heatColor(t){
  const start=[211,216,255]; const end=[82,45,128];
  const c=start.map((s,i)=> Math.round(s+(end[i]-s)*t));
  return `rgb(${c.join(',')})`;
}

function buildSavingsBar(){
  const processes = DATA.processes;
  const grouped = {
    Admissions: processes.find(p=>p.name.includes('Admissions')),
    Advising: processes.find(p=>p.name.includes('Advising')),
    Facilities: processes.find(p=>p.name.includes('Facilities')),
    Library: processes.find(p=>p.name.includes('Library')),
    HR: processes.find(p=>p.name.includes('HR')),
    FinancialAid: processes.find(p=>p.name.includes('Financial Aid'))
  };
  const labels = Object.keys(grouped);
  const hours = labels.map(k=> grouped[k]? grouped[k].hoursSaved:0);
  const costs = labels.map(k=> grouped[k]? grouped[k].costSaved/1000:0);
  new Chart(document.getElementById('savingsBar'),{
    type:'bar',
    data:{ labels, datasets:[
      { label:'Hours Saved', data:hours, backgroundColor:'#F66733', yAxisID:'y' },
      { label:'Cost Saved ($K)', data:costs, backgroundColor:'#522D80', yAxisID:'y1' }
    ]},
    options:{ plugins:{ legend:{ position:'bottom' } },
      scales:{ y:{ beginAtZero:true }, y1:{ beginAtZero:true, position:'right', grid:{ drawOnChartArea:false } } }
    }
  });
}

function listProcesses(){
  const list = document.getElementById('process-list');
  DATA.processes.forEach(p=>{
    const li=document.createElement('li');
    li.className='process-item';
    const statusClass = p.status.toLowerCase().includes('auto')?'auto':
      p.status.toLowerCase().includes('pilot')?'pilot':
      p.status.toLowerCase().includes('plan')?'planned':'';
    li.innerHTML=`
      <div>
        <strong>${p.name}</strong>
        <div class="meta">
          <span class="badge ${statusClass}">${p.status}</span>
          <span>Hours: ${p.hoursSaved}</span>
          <span>Cost: $${(p.costSaved/1000).toFixed(1)}k</span>
        </div>
      </div>
      <div style="font-size:.55rem;color:var(--gray-600);">${p.hoursSaved>0?efficiencySpark(p.hoursSaved):''}</div>`;
    list.appendChild(li);
  });
}
function efficiencySpark(val){
  const pct = Math.min(val/500,1)*100;
  return `<div style="width:60px;height:6px;background:#dfe3ea;border-radius:3px;overflow:hidden;">
    <div style="width:${pct}%;height:100%;background:#F66733;"></div></div>`;
}

function listServiceKpis(){
  const ul=document.getElementById('service-kpis');
  DATA.serviceImprovements.forEach(s=>{
    const li=document.createElement('li');
    const color = s.direction==='improved'?'var(--green)':'var(--red)';
    li.innerHTML=`<strong>${s.metric}</strong><span>${s.value} <span style="color:${color}">(${s.direction})</span></span>`;
    ul.appendChild(li);
  });
}

function buildGovernanceGauge(){
  const g = DATA.governance;
  const achieved = g.policies + g.auditsCompleted;
  const target = g.policiesTarget + g.auditsPlanned;
  const percent = Math.round((achieved/target)*100);
  new Chart(document.getElementById('governanceGauge'),{
    type:'doughnut',
    data:{ labels:['Completed','Remaining'], datasets:[{ data:[percent,100-percent], backgroundColor:[gaugeColor(percent),'#ece7f4'], borderWidth:0, cutout:'72%' }]},
    options:{ plugins:{ legend:{ display:false } } }
  });
  document.getElementById('governance-text').textContent = `${percent}% of governance milestones completed`;
}

function buildEthicsDonut(){
  const e = DATA.ethicsReviews;
  const total = sumValues(e);
  new Chart(document.getElementById('ethicsDonut'),{
    type:'doughnut',
    data:{ labels:['Approved','Pending','Revisions'], datasets:[{ data:[e.approved,e.pending,e.revisions], backgroundColor:['#2E8B57','#E6B800','#D64545'], borderWidth:0, cutout:'60%' }]},
    options:{ plugins:{ legend:{ position:'bottom' } } }
  });
  const ul = document.getElementById('ethics-breakdown');
  Object.entries(e).forEach(([k,v])=>{
    const label = k.charAt(0).toUpperCase()+k.slice(1);
    const li=document.createElement('li');
    li.innerHTML=`<span>${label}</span><span>${v} (${pct(v,total)}%)</span>`;
    ul.appendChild(li);
  });
}

function buildIncidentLine(){
  const s = DATA.securityIncidents;
  new Chart(document.getElementById('incidentsLine'),{
    type:'line',
    data:{ labels:s.labels, datasets:[{ label:'Incidents', data:s.incidents, borderColor:'#D64545', backgroundColor:'rgba(214,69,69,0.25)', tension:.25, fill:true }]},
    options:{ plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, ticks:{ stepSize:1 } } } }
  });
}

function listRiskIndicators(){
  const ul=document.getElementById('risk-indicators');
  DATA.riskIndicators.forEach(r=>{
    const color = riskColor(r.score);
    const li=document.createElement('li');
    li.innerHTML=`<span>${r.area}</span><span style="display:flex;align-items:center;gap:.4rem;">
      <b>${r.score}</b><span class="status-dot ${color}" aria-label="${r.area} risk ${color}"></span></span>`;
    li.setAttribute('data-status', color);
    ul.appendChild(li);
  });
}

function buildAlignmentScorecard(){
  const tbody = document.getElementById('alignment-table');
  DATA.strategicAlignment.forEach(row=>{
    const tr=document.createElement('tr');
    tr.setAttribute('data-status', row.status);
    tr.innerHTML=`<td>${row.goal}</td><td>${row.metric}</td><td>${row.value}</td><td>${sparkline(row.trend)}</td>`;
    tbody.appendChild(tr);
  });
}
function sparkline(values){
  const max=Math.max(...values); const min=Math.min(...values); const range=max-min||1;
  const w=60,h=24,step=w/(values.length-1); let d='';
  values.forEach((v,i)=>{ const x=i*step; const y=h - ((v-min)/range)*(h-4) -2; d += (i===0?'M':'L')+x+','+y; });
  return `<svg class="trend" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" class="sparkline"></path></svg>`;
}

function buildBenchmarkRadar(){
  const b = DATA.benchmark;
  new Chart(document.getElementById('benchmarkRadar'),{
    type:'radar',
    data:{ labels:b.axes, datasets:[
      { label:'Clemson', data:b.clemson, backgroundColor:'rgba(246,103,51,0.35)', borderColor:'#F66733', pointBackgroundColor:'#F66733' },
      { label:'Peer Avg', data:b.peers, backgroundColor:'rgba(82,45,128,0.25)', borderColor:'#522D80', pointBackgroundColor:'#522D80' }
    ]},
    options:{ plugins:{ legend:{ position:'bottom' } }, scales:{ r:{ suggestedMin:0, suggestedMax:100, ticks:{ display:false } } } }
  });
}

function buildRoiLine(){
  const r = DATA.roiTrend;
  new Chart(document.getElementById('roiLine'),{
    type:'line',
    data:{ labels:r.labels, datasets:[
      { label:'ROI %', data:r.roiPct, borderColor:'#2E8B57', backgroundColor:'rgba(46,139,87,0.25)', tension:.25, fill:true, yAxisID:'y' },
      { label:'Value ($M)', data:r.valueCreated, borderColor:'#F66733', backgroundColor:'rgba(246,103,51,0.15)', tension:.25, fill:true, yAxisID:'y1' }
    ]},
    options:{ plugins:{ legend:{ position:'bottom' } }, scales:{ y:{ beginAtZero:true }, y1:{ beginAtZero:true, position:'right', grid:{ drawOnChartArea:false } } } }
  });
  const latestVal = r.valueCreated.at(-1);
  document.getElementById('roi-context').textContent = `Cumulative modeled value: $${latestVal.toFixed(1)}M (excludes intangible benefits).`;
}
