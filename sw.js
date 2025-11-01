self.addEventListener('install',e=>{e.waitUntil(caches.open('vocal3d-cache-v8.1').then(c=>c.addAll(['./','./index.html','./css/styles.css','./js/app.js','./data/sample_bird_embedding.json','./pages/about.html','./pages/privacidad.html','./pages/docs.html','./app-config.json'])))}); self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
self.addEventListener('activate', (event)=>{
  event.waitUntil((async()=>{
    try{
      const allow = ['vocal3d-cache-v8.1'];
      const keys = await caches.keys();
      await Promise.all(keys.filter(k=>!allow.includes(k)).map(k=>caches.delete(k)));
    }catch(e){}
  })());
});
