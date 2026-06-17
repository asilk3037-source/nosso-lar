const CACHE = 'nosso-lar-v11';
const ASSETS = [
  './index.html', './tarefas.html', './compras.html', './gastos.html',
  './perfil.html', './recados.html', './graficos.html', './rachador.html',
  './datas.html', './estoque.html', './cardapio.html', './login.html',
  './style.css', './compras.css', './app.js', './gastos.js', './compras.js',
  './recados.js', './graficos.js', './rachador.js', './datas.js', './estoque.js',
  './cardapio.js', './auth.js', './dialog.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Supabase requests: sempre network first
  if (e.request.url.includes('supabase.co')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
