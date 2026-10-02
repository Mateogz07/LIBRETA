// Libreta · hace que la app abra y funcione sin internet, como una app instalada.
// Al publicar una versión nueva, sube este número (v14 → v15) para que los celulares la actualicen.
const VERSION = "libreta-v14";
const ARCHIVOS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-v3-192.png", "./icon-v3-512.png", "./icon-v3-maskable-512.png", "./apple-touch-icon-v3.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Gemini y demás servicios externos van directo a internet
  // El manifest (nombre e ícono de la app): siempre el más reciente si hay internet, para que Chrome vea los cambios.
  if (url.pathname.endsWith("manifest.webmanifest")) {
    e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put("./manifest.webmanifest", r.clone())); return r; })
      .catch(() => caches.match("./manifest.webmanifest")));
    return;
  }
  // La app abre al instante desde el celular y, si hay internet, se actualiza por detrás para la próxima vez.
  if (req.mode === "navigate") {
    e.respondWith(caches.open(VERSION).then(async c => {
      const guardada = await c.match("./index.html");
      const red = fetch(req).then(r => { if (r.ok) c.put("./index.html", r.clone()); return r; }).catch(() => null);
      return guardada || (await red) || new Response("Sin conexión", { status: 503 });
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone()));
    return r;
  })));
});
