/* sw.js — オフラインで動かすための控え。build_app.py が版を入れます。手で書き換えない */
var V = 'algo-a02-499f0d797c';
var FILES = ['./', './index.html', './manifest.webmanifest',
             './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(function(c){ return c.addAll(FILES); }).catch(function(){}));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k === V ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
/* ★ このアプリは、同じ置き場を他の回のページと分け合うことがあります。
   **自分の控えにあるものだけ**を受け持ち、知らない住所は素通しします。
   どんな失敗にも index.html を返す作りにすると、他の回のページがこのアプリに化けます。 */
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch(err) { return; }
  if(url.origin !== self.location.origin) return;
  var base = new URL('./', self.location).pathname;
  if(url.pathname.indexOf(base) !== 0) return;
  var rest = url.pathname.slice(base.length);
  var mine = (rest === '' || FILES.indexOf('./' + rest) >= 0);
  if(!mine) return;
  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(V).then(function(c){ c.put(req, copy); }).catch(function(){});
        }
        return res;
      }).catch(function(){
        return (req.mode === 'navigate') ? caches.match('./index.html') : Response.error();
      });
    })
  );
});
