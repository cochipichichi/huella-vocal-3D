
const plotEl=document.getElementById('plot');
const btnSample=document.getElementById('btnSample');
const fileJson=document.getElementById('fileJson');
const fileJsonB=document.getElementById('fileJsonB');
const fileAudioB=document.getElementById('fileAudioB');
const clearB=document.getElementById('clearB');
const statusB=document.getElementById('statusB');
const btnTheme=document.getElementById('btnTheme');
const btnContrast=document.getElementById('btnContrast');
const toggleTTS=document.getElementById('toggleTTS');
// === Panel de parámetros ===
const frameSizeEl = document.getElementById('frameSize');
const hopSizeEl = document.getElementById('hopSize');
const colorScaleEl = document.getElementById('colorScale');
const cminEl = document.getElementById('cmin');
const cmaxEl = document.getElementById('cmax');
const exportBtn = document.getElementById('exportBtn');
const mapX=document.getElementById('mapX');
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
const mapY=document.getElementById('mapY');
const mapZ=document.getElementById('mapZ');
const smoothWinEl=document.getElementById('smoothWin');
const rmsThEl=document.getElementById('rmsTh');
let currentData = [];
let currentDataB = [];
let annotations = [];
function getParams(){
  const fs = parseInt(frameSizeEl?.value || 2048);
  const hop = parseInt(hopSizeEl?.value || 512);
  const cmin = (parseFloat(cminEl?.value||3000));
  const cmax = (parseFloat(cmaxEl?.value||10000));
  const cs = (colorScaleEl?.value || 'Rainbow');
  return {fs, hop, cmin, cmax, cs};
}

const speak=(t)=>{ if(!toggleTTS.checked) return; const u=new SpeechSynthesisUtterance(t); speechSynthesis.speak(u); };

const state={theme:localStorage.getItem('theme')||'dark',highContrast:localStorage.getItem('contrast')==='1'};
function applyTheme(){ if(state.theme==='light'){document.documentElement.classList.add('light');} else {document.documentElement.classList.remove('light');} speak(state.theme==='light'?'Modo claro activado':'Modo oscuro activado'); localStorage.setItem('theme',state.theme);}
function applyContrast(){ const root=document.documentElement; if(state.highContrast){root.style.setProperty('--accent','#00ffff'); root.style.setProperty('--fg','#ffffff'); root.style.filter='contrast(1.2) saturate(1.2)';} else {root.style.filter='none'; root.style.removeProperty('--accent'); root.style.removeProperty('--fg');} localStorage.setItem('contrast', state.highContrast?'1':'0');}
btnTheme.onclick=()=>{state.theme=state.theme==='light'?'dark':'light'; applyTheme();};
btnContrast.onclick=()=>{state.highContrast=!state.highContrast; applyContrast();};
applyTheme(); applyContrast();

async function loadJson(url){ const res=await fetch(url); return await res.json(); }
function toTrace(data, name, cs, symbol, opacity){ const p=getParams(); const x=data.map(d=>d.mx??d.x),y=data.map(d=>d.my??d.y),z=data.map(d=>d.mz??d.z); const size=data.map(d=>4+12*(d.amp??d.rms??0.1)); const color=data.map(d=>Math.max(p.cmin,Math.min(p.cmax,d.f0approx??d.centroid))); return {x,y,z,mode:'markers',type:'scatter3d', marker:{size,color,colorscale:cs||p.cs,cmin:p.cmin,cmax:p.cmax,opacity:opacity??0.85,symbol:symbol||'circle'}, name:name||'frames'};}
function toLines(data,name){ const x=[],y=[],z=[]; for(let i=1;i<data.length;i++){ const a=data[i-1], b=data[i]; x.push((a.mx??a.x),(b.mx??b.x),null); y.push((a.my??a.y),(b.my??b.y),null); z.push((a.mz??a.z),(b.mz??b.z),null);} return {x,y,z,mode:'lines',type:'scatter3d', line:{width:2},name:name||'trayectoria',hoverinfo:'skip'}; }
function render(data){ currentData = data; renderBoth(); }
function renderBoth(){ const A = mapXYZ(currentData||[]); const B = mapXYZ(currentDataB||[]); const traces=[]; const layout={scene:{xaxis:{title:'X'},yaxis:{title:'Y'},zaxis:{title:'Z'},bgcolor:'#000'}, paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',margin:{l:0,r:0,t:0,b:0}, annotations: annotations}; if(A.length){ traces.push(toLines(A,'trayectoria A')); traces.push(toTrace(A,'A', csA?.value||'Turbo', symA?.value||'circle', parseFloat(opA?.value||'0.85'))); } if(B.length){ traces.push(toLines(B,'trayectoria B')); traces.push(toTrace(B,'B', csB?.value||'Viridis', symB?.value||'diamond', parseFloat(opB?.value||'0.85'))); } Plotly.newPlot(plotEl,traces,layout,{displaylogo:false,responsive:true}).then(()=>{updateMetrics(A,B);}); const total=(A.length||0)+(B.length||0); speak('Visualización lista. '+total+' frames.'); }
btnSample.onclick=()=>renderFromUrl('data/sample_bird_embedding.json');
fileJson.addEventListener('change',async(e)=>{ const f=e.target.files[0]; if(!f) return; const txt=await f.text(); try{ render(JSON.parse(txt)); }catch(err){ alert('JSON inválido: '+err.message); }});
async function renderFromUrl(url){ const data=await loadJson(url); render(data); }
renderFromUrl('data/sample_bird_embedding.json');


// === Audio uploader / recorder with Meyda ===
const fileAudio = document.getElementById('fileAudio');
const btnMic = document.getElementById('btnMic');
const statusEl = document.getElementById('status');

function hzToClamp(hz){ return Math.max(3000, Math.min(10000, hz||3000)); }

async function processAudioBuffer(buffer){
  // Use Meyda offline extraction over frames
  const sr = buffer.sampleRate;
  const channel = buffer.getChannelData(0);
  const frameSize = getParams().fs;
  const hop = getParams().hop;
  if(!window.Meyda){ alert('Meyda no disponible (CDN). Conéctate a Internet o usa el JSON.'); return; }
  const mf = Meyda.createMeydaAnalyzer({ audioContext: null, source: null, bufferSize: frameSize, sampleRate: sr, windowingFunction: 'hamming', featureExtractors: ['rms','zcr','spectralCentroid','spectralRolloff','spectralFlatness','spectralPeaks'] });

  const data = [];
  for(let i=0;i+frameSize<=channel.length;i+=hop){
    const frame = channel.slice(i, i+frameSize);
    const f = mf.extract(null, frame);
    const amp = Math.max(0.001, f.rms||0);
    const centroid = (f.spectralCentroid||0);
    let f0 = 0;
    if (f.spectralPeaks && f.spectralPeaks.length>0){
      f0 = f.spectralPeaks[0].frequency;
    } else {
      f0 = centroid;
    }
    // Map to 3D: x=flatness, y=rolloff, z=centroid (normalized)
    const x = (f.spectralFlatness||0);
    const y = (f.spectralRolloff||0)/sr;
    const z = (centroid||0)/sr;
    data.push({ t: i/sr, x, y, z, centroid, centroid_norm:(centroid||0)/sr, rolloff:(f.spectralRolloff||0), rolloff_norm:(f.spectralRolloff||0)/sr, flatness:(f.spectralFlatness||0), zcr:(f.zcr||0), amp, rms:amp, f0approx: f0 });
  }
  render(data);
}

fileAudio?.addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  statusEl.textContent = 'Decodificando audio...';
  const arr = await file.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buffer = await ctx.decodeAudioData(arr);
  statusEl.textContent = 'Procesando frames...';
  await processAudioBuffer(buffer);
  statusEl.textContent = 'Listo ✅';
  ctx.close();
});

let micStream = null, micCtx = null, meydaMic = null;
btnMic?.addEventListener('click', async ()=>{
  if(meydaMic){
    meydaMic.stop();
    meydaMic = null;
    micCtx && micCtx.close();
    micStream && micStream.getTracks().forEach(t=>t.stop());
    btnMic.textContent = '🎤 Grabar/Detener';
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

// Exportar JSON de la sesión actual
exportBtn?.addEventListener('click', ()=>{
  if(!currentData || currentData.length===0){ alert('No hay datos para exportar.'); return; }
  const blob = new Blob([JSON.stringify(currentData)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  a.download = 'huella_'+stamp+'.json'; a.click();
});
// Redibujar al cambiar parámetros visuales
[colorScaleEl,cminEl,cmaxEl].forEach(el=> el?.addEventListener('change', ()=>{ if(currentData.length) render(currentData); }));

// === helpers v4 ===
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

[mapX,mapY,mapZ,smoothWinEl,rmsThEl].forEach(el=> el?.addEventListener('change', ()=>{ renderBoth(); }));

fileJsonB?.addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const txt = await f.text();
  try{ currentDataB = JSON.parse(txt); renderBoth(); statusB.textContent='JSON B listo ✅'; }catch(err){ alert('JSON B inválido: '+err.message); }
});
fileAudioB?.addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  statusB.textContent = 'Decodificando audio B...';
  const arr = await file.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buffer = await ctx.decodeAudioData(arr);
  statusB.textContent = 'Procesando frames B...';
  await processAudioBuffer(buffer).then(()=>{ currentDataB = currentData; renderBoth(); statusB.textContent='Listo B ✅'; });
  ctx.close();
});
clearB?.addEventListener('click', ()=>{ currentDataB = []; renderBoth(); statusB.textContent='B removido.'; });

function centroid3D(data){
  if(!data.length) return [0,0,0];
  const sx=data.reduce((a,d)=>a+(d.mx??d.x),0);
  const sy=data.reduce((a,d)=>a+(d.my??d.y),0);
  const sz=data.reduce((a,d)=>a+(d.mz??d.z),0);
  return [sx/data.length, sy/data.length, sz/data.length];
}
function updateMetrics(A,B){
  mCounts.textContent = (A?.length||0)+' / '+(B?.length||0);
  if((A?.length||0) && (B?.length||0)){
    const ca=centroid3D(A), cb=centroid3D(B);
    const dist = Math.sqrt((ca[0]-cb[0])**2 + (ca[1]-cb[1])**2 + (ca[2]-cb[2])**2);
    mDist.textContent = dist.toFixed(4);
    // DTW on centroid_norm sequences (fallback to centroid/sr if missing)
    const sa=A.map(d=> d.centroid_norm ?? (d.centroid||0)/11025);
    const sb=B.map(d=> d.centroid_norm ?? (d.centroid||0)/11025);
    mDTW.textContent = dtw(sa,sb).toFixed(4);
  }else{
    mDist.textContent = '—';
    mDTW.textContent = '—';
  }
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
  return dp[n][m]/(n+m); // normalized
}

function addAnnotation(which){
  const t1=parseFloat(annT1?.value||0), t2=parseFloat(annT2?.value||0);
  const label = annLabel?.value || (which==='A'?'A':'B');
  const mid = (t1+t2)/2;
  annotations.push({xref:'paper', yref:'paper', x:1.02, y: Math.random()*0.9+0.05, text: `${label} [${t1.toFixed(2)}–${t2.toFixed(2)}]s`, showarrow:false, bgcolor:'rgba(255,255,255,0.08)', bordercolor:'rgba(255,255,255,0.18)', borderwidth:1, font:{size:12}});
  renderBoth();
}
btnAnnotA?.addEventListener('click', ()=> addAnnotation('A'));
btnAnnotB?.addEventListener('click', ()=> addAnnotation('B'));
btnClearAnn?.addEventListener('click', ()=>{ annotations = []; renderBoth(); });
capturePng?.addEventListener('click', ()=>{
  Plotly.downloadImage(plotEl, {format:'png', filename:'huella_vocal_3d'});
});
[csA,csB,symA,symB,opA,opB].forEach(el=> el?.addEventListener('change', ()=> renderBoth()));
