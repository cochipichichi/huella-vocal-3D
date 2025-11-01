
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
