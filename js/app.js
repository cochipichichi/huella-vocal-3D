
const plotEl=document.getElementById('plot');
const btnSample=document.getElementById('btnSample');
const fileJson=document.getElementById('fileJson');
const fileJsonB=document.getElementById('fileJsonB');
const fileAudio=document.getElementById('fileAudio');
const fileAudioB=document.getElementById('fileAudioB');
const clearB=document.getElementById('clearB');
const btnMic=document.getElementById('btnMic');
const btnTheme=document.getElementById('btnTheme');
const btnContrast=document.getElementById('btnContrast');
const toggleTTS=document.getElementById('toggleTTS');
const statusEl=document.getElementById('status');
const statusB=document.getElementById('statusB');

const frameSizeEl = document.getElementById('frameSize');
const hopSizeEl = document.getElementById('hopSize');
const colorScaleEl = document.getElementById('colorScale');
const cminEl = document.getElementById('cmin');
const cmaxEl = document.getElementById('cmax');
const exportBtn = document.getElementById('exportBtn');

const mapX=document.getElementById('mapX');
const mapY=document.getElementById('mapY');
const mapZ=document.getElementById('mapZ');
const smoothWinEl=document.getElementById('smoothWin');
const rmsThEl=document.getElementById('rmsTh');

const csA=document.getElementById('csA');
const csB=document.getElementById('csB');
const symA=document.getElementById('symA');
const symB=document.getElementById('symB');
const opA=document.getElementById('opA');
const opB=document.getElementById('opB');
const annT1=document.getElementById('annT1');
const annT2=document.getElementById('annT2');
const annLabel=document.getElementById('annLabel');
const btnAnnotA=document.getElementById('btnAnnotA');
const btnAnnotB=document.getElementById('btnAnnotB');
const btnClearAnn=document.getElementById('btnClearAnn');
const capturePng=document.getElementById('capturePng');
const mDist=document.getElementById('mDist');
const mDTW=document.getElementById('mDTW');
const mCounts=document.getElementById('mCounts');

const specCanvas=document.getElementById('specCanvas');
const specSource=document.getElementById('specSource');
const specMin=document.getElementById('specMin');
const specMax=document.getElementById('specMax');
const specClear=document.getElementById('specClear');

const presetSelect=document.getElementById('presetSelect');
const saveSession=document.getElementById('saveSession');
const historyEl=document.getElementById('history');

// === v7-pro: simple k-NN on summary features ===
let knnModel = null;
function featurize(seq){
  if(!seq || !seq.length) return [0,0,0,0,0,0];
  const mean = k=> seq.reduce((a,d)=>a+(d[k]??0),0)/seq.length;
  const std = k=> { const m=mean(k); return Math.sqrt(seq.reduce((a,d)=>a+((d[k]??0)-m)**2,0)/seq.length)||1; };
  return [
    mean('centroid_norm')||0, mean('rolloff_norm')||0, mean('flatness')||0, mean('zcr')||0, mean('rms')||0,
    (mean('f0approx')||0)/11025
  ];
}
function trainKNN(){
  const A = currentData||[], B=currentDataB||[];
  if(!A.length || !B.length){ alert('Carga A y B para entrenar.'); return; }
  const XA = featurize(A), XB = featurize(B);
  knnModel = {X:[XA,XB], y:['A','B']};
  alert('k‑NN entrenado con A/B (k=1).');
}
function predictActive(){
  if(!knnModel){ alert('Entrena primero el k‑NN.'); return; }
  // Predice para el set seleccionado en specSource
  const src = (specSource?.value||'A');
  const S = (src==='A'? currentData : currentDataB);
  if(!S.length){ alert('No hay datos en el set activo.'); return; }
  const x = featurize(S);
  // k=1 NN
  let best=Infinity, cls='?';
  for(let i=0;i<knnModel.X.length;i++){
    const d = euclid(x, knnModel.X[i]);
    if(d<best){ best=d; cls=knnModel.y[i]; }
  }
  alert('Predicción k‑NN para set '+src+': '+cls+' (d='+best.toFixed(4)+')');
}
function euclid(a,b){ let s=0; for(let i=0;i<a.length;i++){ const d=(a[i]-b[i]); s+=d*d; } return Math.sqrt(s); }
document.getElementById('btnTrain')?.addEventListener('click', trainKNN);
document.getElementById('btnPredict')?.addEventListener('click', predictActive);


// === v7-pro: PDF export ===
async function exportPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:'landscape', unit:'px', format:'a4'});
  // Title
  doc.setFontSize(16); doc.text('Huella Vocal 3D — Reporte', 24, 32);
  // Metrics
  doc.setFontSize(12);
  doc.text('Distancia centroides: ' + (mDist.textContent||'—'), 24, 52);
  doc.text('DTW(centroid_norm): ' + (mDTW.textContent||'—'), 24, 66);
  doc.text('Frames A/B: ' + (mCounts.textContent||'—'), 24, 80);
  // Capture plot
  const imgUrl = await Plotly.toImage(plotEl, {format:'png', width:1000, height:520});
  doc.addImage(imgUrl, 'PNG', 24, 90, 760, 395);
  // Annotations list
  doc.text('Anotaciones:', 24, 505);
  const lines = (Plotly?.gd?._fullLayout?.annotations || []).map(a=> '- '+a.text) || [];
  let y=520;
  for(const L of lines.slice(0,10)){ doc.text(L, 24, y); y+=14; }
  doc.save('reporte_huella.pdf');
}
document.getElementById('btnPDF')?.addEventListener('click', exportPDF);

// === v7-pro: Spectrogram brush selection ===
let brushing = false, bx0=null, bx1=null;
specCanvas?.addEventListener('mousedown', (e)=>{ brushing=true; specCanvas.classList.add('brushing'); const r=specCanvas.getBoundingClientRect(); bx0=(e.clientX-r.left)/r.width; bx1=bx0; drawBrush(); });
specCanvas?.addEventListener('mousemove', (e)=>{ if(!brushing) return; const r=specCanvas.getBoundingClientRect(); bx1=(e.clientX-r.left)/r.width; drawBrush(); });
window.addEventListener('mouseup', ()=>{ if(!brushing) return; brushing=false; specCanvas.classList.remove('brushing'); applyBrush(); });
function drawBrush(){
  updateSpectrogram();
  const ctx=specCanvas.getContext('2d'); const W=specCanvas.width, H=specCanvas.height;
  const x0=Math.floor(Math.min(bx0,bx1)*W), x1=Math.floor(Math.max(bx0,bx1)*W);
  ctx.fillStyle='rgba(255,255,0,0.15)'; ctx.fillRect(x0,0,Math.max(1,x1-x0),H);
  ctx.strokeStyle='rgba(255,255,0,0.8)'; ctx.lineWidth=2; ctx.strokeRect(x0+0.5,0.5,Math.max(1,x1-x0)-1,H-1);
}
function applyBrush(){
  if(bx0==null||bx1==null) return;
  const lo=Math.min(bx0,bx1), hi=Math.max(bx0,bx1);
  const src = (specSource?.value||'A');
  const A = currentData||[], B=currentDataB||[];
  const data = (src==='A'?A:B);
  if(!data.length) return;
  // Map brush (0..1) to frame indices
  const n = data.length;
  const i0 = Math.max(0, Math.floor(lo*n));
  const i1 = Math.min(n-1, Math.ceil(hi*n));
  const sliced = data.slice(i0,i1+1);
  if(src==='A'){ currentData=sliced; } else { currentDataB=sliced; }
  renderBoth();
}

// === v7-pro: Presentation mode ===
const btnPresent = document.getElementById('btnPresent');
btnPresent?.addEventListener('click', ()=>{
  const b = document.body;
  b.classList.toggle('presentation');
  Plotly.Plots.resize(plotEl);
});

// === v7: Fullscreen controls for 3D plot ===
const plotWrap = document.getElementById('plotWrap');
const btnFull = document.getElementById('btnFull');

function isFullscreen(){
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
}
function requestFs(el){
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.msRequestFullscreen) return el.msRequestFullscreen();
}
function exitFs(){
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
}
function toggleFullscreen(){
  if(isFullscreen()){ exitFs(); }
  else { requestFs(plotWrap); }
}
btnFull?.addEventListener('click', toggleFullscreen);
plotEl?.addEventListener('dblclick', toggleFullscreen);
// Keyboard F toggles
document.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase()==='f'){ toggleFullscreen(); }});
// Resize Plotly on resize or fullscreen changes
['resize','orientationchange','fullscreenchange','webkitfullscreenchange','msfullscreenchange'].forEach(ev=>{
  window.addEventListener(ev, ()=>{ try{ Plotly.Plots.resize(plotEl); }catch{} });
});
// Add hover ripple origin for buttons
document.addEventListener('mousemove', (e)=>{
  document.querySelectorAll('.btn').forEach(b=>{
    const rect=b.getBoundingClientRect();
    const mx=((e.clientX-rect.left)/Math.max(1,rect.width))*100;
    b.style.setProperty('--mx', mx+'%');
  });
});


const speak=(t)=>{ if(!toggleTTS.checked) return; const u=new SpeechSynthesisUtterance(t); speechSynthesis.speak(u); };

const state={theme:localStorage.getItem('theme')||'dark',highContrast:localStorage.getItem('contrast')==='1'};
function applyTheme(){ if(state.theme==='light'){document.documentElement.classList.add('light');} else {document.documentElement.classList.remove('light');} speak(state.theme==='light'?'Modo claro activado':'Modo oscuro activado'); localStorage.setItem('theme',state.theme);}
function applyContrast(){ const root=document.documentElement; if(state.highContrast){root.style.setProperty('--accent','#00ffff'); root.style.setProperty('--fg','#ffffff'); root.style.filter='contrast(1.2) saturate(1.2)';} else {root.style.filter='none'; root.style.removeProperty('--accent'); root.style.removeProperty('--fg');} localStorage.setItem('contrast', state.highContrast?'1':'0');}
btnTheme.onclick=()=>{state.theme=state.theme==='light'?'dark':'light'; applyTheme();};
btnContrast.onclick=()=>{state.highContrast=!state.highContrast; applyContrast();};
applyTheme(); applyContrast();

function getParams(){
  const fs = parseInt(frameSizeEl?.value || 2048);
  const hop = parseInt(hopSizeEl?.value || 512);
  const cmin = (parseFloat(cminEl?.value||3000));
  const cmax = (parseFloat(cmaxEl?.value||10000));
  const cs = (colorScaleEl?.value || 'Rainbow');
  return {fs, hop, cmin, cmax, cs};
}

// helpers v4/v5
function movingAvg(arr, w){
  if(w<=1) return arr;
  const out = new Array(arr.length).fill(0);
  const half = Math.floor(w/2);
  for(let i=0;i<arr.length;i++){
    let s=0,c=0;
    for(let k=i-half;k<=i+half;k++){
      if(k>=0 && k<arr.length){ s+=arr[k]; c++; }
    }
    out[i]=s/c;
  }
  return out;
}
function featureVal(d, key){
  if(key==='embed_x') return d.x;
  if(key==='embed_y') return d.y;
  if(key==='embed_z') return d.z;
  if(key==='centroid_norm') return (d.centroid_norm ?? (d.centroid||0)/11025);
  if(key==='rolloff_norm') return (d.rolloff_norm ?? (d.rolloff||0)/11025);
  if(key==='flatness') return (d.flatness ?? 0);
  if(key==='zcr') return (d.zcr ?? 0);
  if(key==='rms') return (d.amp ?? d.rms ?? 0);
  return 0;
}
function mapXYZ(data){
  const w = parseInt(smoothWinEl?.value||1);
  const rx = data.map(d=>featureVal(d, mapX.value));
  const ry = data.map(d=>featureVal(d, mapY.value));
  const rz = data.map(d=>featureVal(d, mapZ.value));
  const rms = data.map(d=> (d.amp ?? d.rms ?? 0));
  const th = parseFloat(rmsThEl?.value||0);
  const keep = rms.map(v=> v>=th);
  const X = movingAvg(rx,w), Y=movingAvg(ry,w), Z=movingAvg(rz,w);
  const filtered=[];
  for(let i=0;i<data.length;i++){ if(keep[i]){ const dd=Object.assign({}, data[i]); dd.mx=X[i]; dd.my=Y[i]; dd.mz=Z[i]; filtered.push(dd);} }
  return filtered;
}

function toTrace(data, name, cs, symbol, opacity){
  const p=getParams();
  const x=data.map(d=>d.mx??d.x),y=data.map(d=>d.my??d.y),z=data.map(d=>d.mz??d.z);
  const size=data.map(d=>4+12*(d.amp??d.rms??0.1));
  const color=data.map(d=>Math.max(p.cmin,Math.min(p.cmax,d.f0approx??d.centroid)));
  return {x,y,z,mode:'markers',type:'scatter3d', marker:{size,color,colorscale:cs||p.cs,cmin:p.cmin,cmax:p.cmax,opacity:opacity??0.85,symbol:symbol||'circle'}, name:name||'frames'};
}
function toLines(data,name){
  const x=[],y=[],z=[];
  for(let i=1;i<data.length;i++){
    const a=data[i-1], b=data[i];
    x.push((a.mx??a.x),(b.mx??b.x),null);
    y.push((a.my??a.y),(b.my??b.y),null);
    z.push((a.mz??a.z),(b.mz??b.z),null);
  }
  return {x,y,z,mode:'lines',type:'scatter3d', line:{width:2},name:name||'trayectoria',hoverinfo:'skip'};
}

let currentData = [];
let currentDataB = [];
let annotations = [];

function render(data){ currentData = data; renderBoth(); }
function renderBoth(){
  const A = mapXYZ(currentData||[]);
  const B = mapXYZ(currentDataB||[]);
  const traces=[];
  const layout={scene:{xaxis:{title:'X'},yaxis:{title:'Y'},zaxis:{title:'Z'},bgcolor:'#000'}, paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',margin:{l:0,r:0,t:0,b:0}, annotations: annotations};
  if(A.length){ traces.push(toLines(A,'trayectoria A')); traces.push(toTrace(A,'A', csA?.value||'Turbo', symA?.value||'circle', parseFloat(opA?.value||'0.85'))); }
  if(B.length){ traces.push(toLines(B,'trayectoria B')); traces.push(toTrace(B,'B', csB?.value||'Viridis', symB?.value||'diamond', parseFloat(opB?.value||'0.85'))); }
  Plotly.newPlot(plotEl,traces,layout,{displaylogo:false,responsive:true}).then(()=>{updateMetrics(A,B); updateSpectrogram();});
  const total=(A.length||0)+(B.length||0);
  speak('Visualización lista. '+total+' frames.');
}

// Metrics & DTW
function centroid3D(data){
  if(!data.length) return [0,0,0];
  const sx=data.reduce((a,d)=>a+(d.mx??d.x),0);
  const sy=data.reduce((a,d)=>a+(d.my??d.y),0);
  const sz=data.reduce((a,d)=>a+(d.mz??d.z),0);
  return [sx/data.length, sy/data.length, sz/data.length];
}
function dtw(a,b){
  const n=a.length, m=b.length;
  const dp = Array.from({length:n+1}, ()=> new Float64Array(m+1).fill(Infinity));
  dp[0][0]=0;
  for(let i=1;i<=n;i++){
    for(let j=1;j<=m;j++){
      const cost = Math.abs(a[i-1]-b[j-1]);
      dp[i][j] = cost + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[n][m]/(n+m);
}
function updateMetrics(A,B){
  mCounts.textContent = (A?.length||0)+' / '+(B?.length||0);
  if((A?.length||0) && (B?.length||0)){
    const ca=centroid3D(A), cb=centroid3D(B);
    const dist = Math.sqrt((ca[0]-cb[0])**2 + (ca[1]-cb[1])**2 + (ca[2]-cb[2])**2);
    mDist.textContent = dist.toFixed(4);
    const sa=A.map(d=> d.centroid_norm ?? (d.centroid||0)/11025);
    const sb=B.map(d=> d.centroid_norm ?? (d.centroid||0)/11025);
    mDTW.textContent = dtw(sa,sb).toFixed(4);
  }else{
    mDist.textContent = '—';
    mDTW.textContent = '—';
  }
}

// Annotations
function addAnnotation(which){
  const t1=parseFloat(annT1?.value||0), t2=parseFloat(annT2?.value||0);
  const label = annLabel?.value || which;
  annotations.push({xref:'paper', yref:'paper', x:1.02, y: Math.random()*0.9+0.05, text: `${label} [${t1.toFixed(2)}–${t2.toFixed(2)}]s`, showarrow:false, bgcolor:'rgba(255,255,255,0.08)', bordercolor:'rgba(255,255,255,0.18)', borderwidth:1, font:{size:12}});
  renderBoth();
}
btnAnnotA?.addEventListener('click', ()=> addAnnotation('A'));
btnAnnotB?.addEventListener('click', ()=> addAnnotation('B'));
btnClearAnn?.addEventListener('click', ()=>{ annotations = []; renderBoth(); });
capturePng?.addEventListener('click', ()=>{ Plotly.downloadImage(plotEl, {format:'png', filename:'huella_vocal_3d'}); });
[csA,csB,symA,symB,opA,opB,mapX,mapY,mapZ,smoothWinEl,rmsThEl].forEach(el=> el?.addEventListener('change', ()=> renderBoth()));

// Export JSON
let currentDataExport = [];
exportBtn?.addEventListener('click', ()=>{
  const all = currentDataB?.length ? currentData.concat(currentDataB) : currentData;
  const blob = new Blob([JSON.stringify(all)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  a.download = 'huella_'+stamp+'.json'; a.click();
});

// Spectrogram from frames (centroid/rolloff proxy)
function drawSpectrogram(dataset){
  const ctx = specCanvas.getContext('2d');
  const W = specCanvas.width, H = specCanvas.height;
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
  if(!dataset || !dataset.length) return;
  const minK = parseFloat(specMin.value||0)*1000, maxK = parseFloat(specMax.value||11)*1000;
  const n = dataset.length;
  for(let i=0;i<n;i++){
    const d = dataset[i];
    const c = d.centroid || 0;
    const r = d.rolloff || c*1.5;
    const amp = Math.min(1, Math.max(0, (d.amp||d.rms||0)*4));
    const x = Math.floor(i * (W/n));
    const yc = H - Math.floor((c - minK) / (maxK - minK) * H);
    const yr = H - Math.floor((r - minK) / (maxK - minK) * H);
    const a1 = 0.35+0.5*amp; const a2 = 0.15+0.3*amp;
    if(isFinite(yc)){ const yy=Math.min(H-1, Math.max(0, yc-1)); const h=2; 
      const rcol = Math.floor(255*(amp)); const gcol = Math.floor(180*(1-amp/2)); const bcol = 255;
      plotPixel(ctx, x, yy, `rgba(${rcol},${gcol},${bcol},${a1})`, 2, h);
    }
    if(isFinite(yr)){ const y1 = Math.min(H-1, Math.max(0, yr)); const y2 = Math.min(H-1, Math.max(0, yc)); 
      ctx.fillStyle = `rgba(80,180,255,${a2})`; ctx.fillRect(x, Math.min(y1,y2), 2, Math.max(1,Math.abs(y2-y1))); }
  }
}
function plotPixel(ctx,x,y,style,w,h){ ctx.fillStyle=style; ctx.fillRect(x,y,w||1,h||1); }
function updateSpectrogram(){
  const src = (specSource?.value||'A');
  const A = mapXYZ(currentData||[]);
  const B = mapXYZ(currentDataB||[]);
  drawSpectrogram(src==='A'?A:B);
}
[specMin,specMax,specSource].forEach(el=> el?.addEventListener('change', updateSpectrogram));
specClear?.addEventListener('click', ()=>{ const ctx=specCanvas.getContext('2d'); ctx.fillStyle='#000'; ctx.fillRect(0,0,specCanvas.width,specCanvas.height); });

// Presets
const PRESETS = {
  default: {fs:2048, hop:512, mapX:'embed_x', mapY:'embed_y', mapZ:'embed_z', cmin:3000, cmax:10000, cs:'Rainbow', smooth:1, rms:0.02},
  birdsong_basics: {fs:2048, hop:256, mapX:'centroid_norm', mapY:'rolloff_norm', mapZ:'flatness', cmin:3000, cmax:10000, cs:'Turbo', smooth:5, rms:0.03},
  formants: {fs:4096, hop:512, mapX:'embed_x', mapY:'centroid_norm', mapZ:'rolloff_norm', cmin:2000, cmax:9000, cs:'Portland', smooth:7, rms:0.02},
  fast_trills: {fs:1024, hop:256, mapX:'zcr', mapY:'centroid_norm', mapZ:'rms', cmin:3500, cmax:11000, cs:'Viridis', smooth:3, rms:0.04},
  alarm_calls: {fs:2048, hop:256, mapX:'rms', mapY:'centroid_norm', mapZ:'flatness', cmin:3000, cmax:12000, cs:'Turbo', smooth:5, rms:0.05},
};
function applyPreset(p){
  const s = PRESETS[p] || PRESETS.default;
  frameSizeEl.value = s.fs; hopSizeEl.value = s.hop;
  mapX.value = s.mapX; mapY.value = s.mapY; mapZ.value = s.mapZ;
  cminEl.value = s.cmin; cmaxEl.value = s.cmax; colorScaleEl.value = s.cs;
  smoothWinEl.value = s.smooth; rmsThEl.value = s.rms;
  renderBoth();
}
presetSelect?.addEventListener('change', ()=> applyPreset(presetSelect.value));

// Persistence
function saveToLocal(){
  const name = prompt('Nombre para la sesión (A+B y parámetros):','session_'+new Date().toISOString().slice(0,16));
  if(!name) return;
  const payload = {
    A: currentData, B: currentDataB,
    params: { theme: state.theme, contrast: state.highContrast, preset: presetSelect?.value || 'default',
      mapX: mapX.value, mapY: mapY.value, mapZ: mapZ.value, fs: frameSizeEl.value, hop: hopSizeEl.value,
      cmin: cminEl.value, cmax: cmaxEl.value, cs: colorScaleEl.value, smooth: smoothWinEl.value, rms: rmsThEl.value }
  };
  localStorage.setItem('vocal3d_'+name, JSON.stringify(payload));
  refreshHistory();
}
function refreshHistory(){
  historyEl.innerHTML='';
  Object.keys(localStorage).filter(k=>k.startsWith('vocal3d_')).sort().forEach(k=>{
    const btn = document.createElement('button');
    btn.className='btn'; btn.textContent = '📂 '+k.replace('vocal3d_','');
    btn.onclick = ()=>{
      try{ const payload = JSON.parse(localStorage.getItem(k));
        currentData = payload.A || []; currentDataB = payload.B || [];
        const p = payload.params||{};
        state.theme = p.theme || state.theme; applyTheme();
        state.highContrast = p.contrast ?? state.highContrast; applyContrast();
        presetSelect.value = p.preset || 'default';
        mapX.value = p.mapX || mapX.value; mapY.value = p.mapY || mapY.value; mapZ.value = p.mapZ || mapZ.value;
        frameSizeEl.value = p.fs || frameSizeEl.value; hopSizeEl.value = p.hop || hopSizeEl.value;
        cminEl.value = p.cmin || cminEl.value; cmaxEl.value = p.cmax || cmaxEl.value; colorScaleEl.value = p.cs || colorScaleEl.value;
        smoothWinEl.value = p.smooth || smoothWinEl.value; rmsThEl.value = p.rms || rmsThEl.value;
        renderBoth();
      }catch(e){ alert('No se pudo abrir la sesión: '+e.message); }
    };
    const del = document.createElement('button'); del.className='btn'; del.textContent='🗑️'; del.onclick=()=>{ localStorage.removeItem(k); refreshHistory(); };
    historyEl.appendChild(btn); historyEl.appendChild(del);
  });
}
saveSession?.addEventListener('click', saveToLocal);
window.addEventListener('load', refreshHistory);

// v8 Settings + Config
const btnSettings=document.getElementById('btnSettings');
const modal=document.getElementById('settingsModal');
const setTheme=document.getElementById('setTheme');
const setContrast=document.getElementById('setContrast');
const setTTS=document.getElementById('setTTS');
const setPreset=document.getElementById('setPreset');
const setMapX=document.getElementById('setMapX');
const setMapY=document.getElementById('setMapY');
const setMapZ=document.getElementById('setMapZ');
const setSmooth=document.getElementById('setSmooth');
const setRmsTh=document.getElementById('setRmsTh');
const setCS=document.getElementById('setCS');
const setPresentation=document.getElementById('setPresentation');
const setSave=document.getElementById('setSave');
const setCancel=document.getElementById('setCancel');
const setReset=document.getElementById('setReset');

const CFG_DEFAULT={ enablePro:true, enableMic:true, enablePDF:true, version:'v8' };
async function loadConfig(){ try{ const r=await fetch('app-config.json'); const c=await r.json(); return Object.assign({},CFG_DEFAULT,c); } catch{ return CFG_DEFAULT; } }
let APP_CFG=CFG_DEFAULT;

function openModal(){ modal?.classList.add('open'); }
function closeModal(){ modal?.classList.remove('open'); }
function prefsGet(){ try{ return JSON.parse(localStorage.getItem('vocal3d_prefs')||'{}'); }catch{ return {}; } }
function prefsSet(p){ try{ localStorage.setItem('vocal3d_prefs', JSON.stringify(p||{})); }catch{} }

function applyPrefs(){
  const p=prefsGet();
  if(p.theme){ state.theme=p.theme; applyTheme(); }
  if(typeof p.contrast==='boolean'){ state.highContrast=p.contrast; applyContrast(); }
  if(typeof p.tts==='boolean'){ toggleTTS.checked=p.tts; }
  if(p.preset){ presetSelect.value=p.preset; }
  if(p.mapX){ mapX.value=p.mapX; } if(p.mapY){ mapY.value=p.mapY; } if(p.mapZ){ mapZ.value=p.mapZ; }
  if(p.smooth){ smoothWinEl.value=p.smooth; } if(p.rmsTh){ rmsThEl.value=p.rmsTh; }
  if(p.cs){ colorScaleEl.value=p.cs; }
  if(p.presentation){ document.body.classList.add('presentation'); }
  try{ Plotly.Plots.resize(plotEl); }catch{}
}
function populateModal(){
  const p=prefsGet();
  setTheme.value=p.theme||state.theme||'dark';
  setContrast.checked = p.contrast ?? state.highContrast ?? false;
  setTTS.checked = p.tts ?? (toggleTTS?.checked||false);
  setPreset.value = p.preset || (presetSelect?.value||'default');
  setMapX.value = p.mapX || mapX.value;
  setMapY.value = p.mapY || mapY.value;
  setMapZ.value = p.mapZ || mapZ.value;
  setSmooth.value = p.smooth || smoothWinEl.value;
  setRmsTh.value = p.rmsTh || rmsThEl.value;
  setCS.value = p.cs || colorScaleEl.value;
  setPresentation.checked = p.presentation || false;
}
btnSettings?.addEventListener('click', ()=>{ populateModal(); openModal(); });
setCancel?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });
setReset?.addEventListener('click', ()=>{ localStorage.removeItem('vocal3d_prefs'); populateModal(); });
setSave?.addEventListener('click', ()=>{
  const p={ theme:setTheme.value, contrast:setContrast.checked, tts:setTTS.checked, preset:setPreset.value,
    mapX:setMapX.value, mapY:setMapY.value, mapZ:setMapZ.value, smooth:parseInt(setSmooth.value||1),
    rmsTh:parseFloat(setRmsTh.value||0.02), cs:setCS.value, presentation:setPresentation.checked };
  prefsSet(p); closeModal(); applyPrefs(); renderBoth();
});
loadConfig().then(cfg=>{ APP_CFG=cfg; applyPrefs(); });


// Data loaders
async function loadJson(url){ const res=await fetch(url); return await res.json(); }
function renderFromUrl(url){ loadJson(url).then(render); }
btnSample.onclick=()=>renderFromUrl('data/sample_bird_embedding.json');

fileJson?.addEventListener('change',async(e)=>{ const f=e.target.files[0]; if(!f) return; const txt=await f.text(); try{ render(JSON.parse(txt)); statusEl.textContent='JSON A listo ✅'; }catch(err){ alert('JSON inválido: '+err.message); }});
fileJsonB?.addEventListener('change',async(e)=>{ const f=e.target.files[0]; if(!f) return; const txt=await f.text(); try{ currentDataB=JSON.parse(txt); renderBoth(); statusB.textContent='JSON B listo ✅'; }catch(err){ alert('JSON B inválido: '+err.message); }});

async function processAudioBufferToData(buffer){
  const sr = buffer.sampleRate;
  const channel = buffer.getChannelData(0);
  const frameSize = getParams().fs;
  const hop = getParams().hop;
  if(!window.Meyda){ alert('Meyda no disponible (CDN).'); return []; }
  const mf = Meyda.createMeydaAnalyzer({ audioContext: null, source: null, bufferSize: frameSize, sampleRate: sr, windowingFunction: 'hamming', featureExtractors: ['rms','zcr','spectralCentroid','spectralRolloff','spectralFlatness','spectralPeaks'] });
  const data = [];
  for(let i=0;i+frameSize<=channel.length;i+=hop){
    const frame = channel.slice(i, i+frameSize);
    const f = mf.extract(null, frame);
    const amp = Math.max(0.001, f.rms||0);
    const centroid = (f.spectralCentroid||0);
    let f0 = (f.spectralPeaks && f.spectralPeaks[0]) ? f.spectralPeaks[0].frequency : centroid;
    const x = (f.spectralFlatness||0);
    const y = (f.spectralRolloff||0)/sr;
    const z = (centroid||0)/sr;
    data.push({ t: i/sr, x, y, z, centroid, centroid_norm:(centroid||0)/sr, rolloff:(f.spectralRolloff||0), rolloff_norm:(f.spectralRolloff||0)/sr, flatness:(f.spectralFlatness||0), zcr:(f.zcr||0), amp, rms:amp, f0approx: f0 });
  }
  return data;
}

fileAudio?.addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  statusEl.textContent = 'Decodificando audio...';
  const arr = await file.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buffer = await ctx.decodeAudioData(arr);
  statusEl.textContent = 'Procesando frames...';
  const data = await processAudioBufferToData(buffer);
  ctx.close();
  render(data);
  statusEl.textContent = 'Listo A ✅';
});

fileAudioB?.addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  statusB.textContent = 'Decodificando audio B...';
  const arr = await file.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buffer = await ctx.decodeAudioData(arr);
  statusB.textContent = 'Procesando frames B...';
  currentDataB = await processAudioBufferToData(buffer);
  ctx.close();
  renderBoth();
  statusB.textContent = 'Listo B ✅';
});

let micStream = null, micCtx = null, meydaMic = null;
btnMic?.addEventListener('click', async ()=>{
  if(meydaMic){
    meydaMic.stop(); meydaMic = null;
    micCtx && micCtx.close();
    micStream && micStream.getTracks().forEach(t=>t.stop());
    btnMic.textContent = '🎤 Grabar A';
    statusEl.textContent = 'Grabación detenida.';
    return;
  }
  try{
    micStream = await navigator.mediaDevices.getUserMedia({audio:true});
    micCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = micCtx.createMediaStreamSource(micStream);
    meydaMic = Meyda.createMeydaAnalyzer({audioContext: micCtx, source, bufferSize: getParams().fs, windowingFunction:'hamming', featureExtractors:['rms','zcr','spectralCentroid','spectralRolloff','spectralFlatness','spectralPeaks']});
    const live = [];
    meydaMic.start((f)=>{
      const sr = micCtx.sampleRate;
      const centroid = f.spectralCentroid||0;
      const amp = Math.max(0.001, f.rms||0);
      const f0 = (f.spectralPeaks && f.spectralPeaks[0]) ? f.spectralPeaks[0].frequency : centroid;
      const x = (f.spectralFlatness||0);
      const y = (f.spectralRolloff||0)/sr;
      const z = (centroid||0)/sr;
      live.push({ t: live.length* (getParams().fs/sr), x, y, z, centroid, centroid_norm:(centroid||0)/sr, rolloff:(f.spectralRolloff||0), rolloff_norm:(f.spectralRolloff||0)/sr, flatness:(f.spectralFlatness||0), zcr:(f.zcr||0), amp, rms:amp, f0approx: f0 });
      if(live.length % 10 === 0){ render(live); }
      statusEl.textContent = 'Grabando… frames: '+live.length;
    });
    btnMic.textContent = '⏹️ Detener';
  }catch(err){
    alert('No se pudo acceder al micrófono: '+err.message);
  }
});

// Initialize
renderFromUrl('data/sample_bird_embedding.json');
