/* sw.js — オフラインで動かすための控え。build_app.py が版を入れます。手で書き換えない */
var V = 'algo-a02-34ce7b30de';
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

  function keep(res){
    if(res && res.ok){
      var copy = res.clone();
      caches.open(V).then(function(c){ c.put(req, copy); }).catch(function(){});
    }
    return res;
  }
  /* ★ 本文だけは「通信があれば新しい方、無ければ控え」。
     控え優先のままだと、直したものが学生の端末に届くのが 1 回遅れます（授業中に直せません）。 */
  var isDoc = (rest === '' || rest === 'index.html' || req.mode === 'navigate');
  if(isDoc){
    e.respondWith(
      fetch(req).then(keep).catch(function(){
        return caches.match(req).then(function(h){ return h || caches.match('./index.html'); });
      })
    );
    return;
  }
  /* 絵や札は控え優先。中身が変わったら版ごと入れ替わります */
  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(keep).catch(function(){ return Response.error(); });
    })
  );
});
