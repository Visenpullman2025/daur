/* 大农庄 离线缓存。
   ★策略:静态资源(图标/贴图/背景/CSS/JS,都带 ?v= 版本号→内容不变)= 缓存优先(秒开、不重复下、不闪头像);
        HTML 页面 = 网络优先(发新版即更新),离线回退缓存。改版本号(?v= + 下方 CACHE)即清旧缓存拿新资源。 */
const CACHE = 'daur-cache-2606201400';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => k !== CACHE ? caches.delete(k) : null))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    // 网络优先:拿最新页面;离线回退缓存
    e.respondWith(
      fetch(req).then(r => { if (r && r.status === 200) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
  } else {
    // 静态资源:缓存优先(命中即秒返,不走网络→头像/贴图不再每次重载);未命中才下载并存
    e.respondWith(
      caches.match(req).then(m => m || fetch(req).then(r => { if (r && r.status === 200) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }))
    );
  }
});
