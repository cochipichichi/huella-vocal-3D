
const plotEl=document.getElementById('plot');
const btnSample=document.getElementById('btnSample');
const fileJson=document.getElementById('fileJson');
const btnTheme=document.getElementById('btnTheme');
const btnContrast=document.getElementById('btnContrast');
const toggleTTS=document.getElementById('toggleTTS');
const speak=(t)=>{ if(!toggleTTS.checked) return; const u=new SpeechSynthesisUtterance(t); speechSynthesis.speak(u); };

const state={theme:localStorage.getItem('theme')||'dark',highContrast:localStorage.getItem('contrast')==='1'};
function applyTheme(){ if(state.theme==='light'){document.documentElement.classList.add('light');} else {document.documentElement.classList.remove('light');} speak(state.theme==='light'?'Modo claro activado':'Modo oscuro activado'); localStorage.setItem('theme',state.theme);}
function applyContrast(){ const root=document.documentElement; if(state.highContrast){root.style.setProperty('--accent','#00ffff'); root.style.setProperty('--fg','#ffffff'); root.style.filter='contrast(1.2) saturate(1.2)';} else {root.style.filter='none'; root.style.removeProperty('--accent'); root.style.removeProperty('--fg');} localStorage.setItem('contrast', state.highContrast?'1':'0');}
btnTheme.onclick=()=>{state.theme=state.theme==='light'?'dark':'light'; applyTheme();};
btnContrast.onclick=()=>{state.highContrast=!state.highContrast; applyContrast();};
applyTheme(); applyContrast();

async function loadJson(url){ const res=await fetch(url); return await res.json(); }
function toTrace(data){ const x=data.map(d=>d.x),y=data.map(d=>d.y),z=data.map(d=>d.z); const size=data.map(d=>4+12*(d.amp??0.1)); const color=data.map(d=>Math.max(3000,Math.min(10000,d.f0approx??d.centroid))); return {x,y,z,mode:'markers',type:'scatter3d', marker:{size,color,colorscale:'Rainbow',cmin:3000,cmax:10000,opacity:0.9}, name:'frames'};}
function toLines(data){ const x=[],y=[],z=[]; for(let i=1;i<data.length;i++){ x.push(data[i-1].x,data[i].x,null); y.push(data[i-1].y,data[i].y,null); z.push(data[i-1].z,data[i].z,null);} return {x,y,z,mode:'lines',type:'scatter3d', line:{width:2},name:'trayectoria',hoverinfo:'skip'}; }
function render(data){ const layout={scene:{xaxis:{title:'X'},yaxis:{title:'Y'},zaxis:{title:'Z'},bgcolor:'#000'}, paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',margin:{l:0,r:0,t:0,b:0}}; Plotly.newPlot(plotEl,[toLines(data),toTrace(data)],layout,{displaylogo:false,responsive:true}); speak('Visualización lista. '+data.length+' frames.'); }
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
  const frameSize = 2048;
  const hop = 512;
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
    data.push({ t: i/sr, x, y, z, centroid, amp, f0approx: f0 });
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
    meydaMic = Meyda.createMeydaAnalyzer({audioContext: micCtx, source, bufferSize: 2048, windowingFunction:'hamming', featureExtractors:['rms','spectralCentroid','spectralRolloff','spectralFlatness','spectralPeaks']});
    const live = [];
    meydaMic.start((f)=>{
      const sr = micCtx.sampleRate;
      const centroid = f.spectralCentroid||0;
      const amp = Math.max(0.001, f.rms||0);
      const f0 = (f.spectralPeaks && f.spectralPeaks[0]) ? f.spectralPeaks[0].frequency : centroid;
      const x = (f.spectralFlatness||0);
      const y = (f.spectralRolloff||0)/sr;
      const z = (centroid||0)/sr;
      live.push({ t: live.length* (2048/sr), x, y, z, centroid, amp, f0approx: f0 });
      if(live.length % 10 === 0){ render(live); }
      statusEl.textContent = 'Grabando… frames: '+live.length;
    });
    btnMic.textContent = '⏹️ Detener';
  }catch(err){
    alert('No se pudo acceder al micrófono: '+err.message);
  }
});
