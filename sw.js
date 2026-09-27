// Service worker: deja la app abriendo aunque no haya señal (el taller o la obra).
// OJO: subir la versión en cada publicación.
const CACHE = 'despiece-v12';
const ARCHIVOS = [
  './', 'index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'materiales.js', 'exportar.js', 'orbe.js', 'voz.js', 'closet/modelos.js', 'closet/acciones.js', 'closet/ensayo.js', 'closet/despiece.js', 'closet/visor3d.js', 'closet/plano.js', 'closet/ropa3d.js',
  'img/closet.svg', 'img/cocina.svg', 'img/bano.svg', 'img/puerta.svg', 'img/sala.svg', 'img/comedor.svg', 'img/cama.svg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' = pedirle los archivos al servidor, nunca a la memoria del navegador
  // (GitHub Pages deja copias de hasta 10 min y eso mezclaba versiones viejas con nuevas).
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const guardar = (req, r) => {
  if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
  return r;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Archivos de la app: red primero, confirmando con el servidor que sean los últimos;
  // si no hay señal, lo guardado.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(url.href, { cache: 'no-cache' })
        .then(r => guardar(req, r))
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // Motor 3D (versión fija en el CDN): lo guardado primero; así el 3D abre sin señal.
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => guardar(req, res))));
});
