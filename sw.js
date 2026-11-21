const C = "pwamaker-v1-ab6e1c";
const P = ["index.html","offline.html","manifest.webmanifest","icons/icon-192.png","icons/icon-maskable-512.png"];
const SC = self;
const APIC = false;
const API_MAX = 60000;
SC.addEventListener('install', function (e) {
e.waitUntil(
caches.open(C).then(function (cache) {
return Promise.all(P.map(function (u) {
return cache.add(new Request(u, {cache: 'reload'})).catch(function () {});
}));
}).then(function () {
self.skipWaiting()
})
);
});
SC.addEventListener('activate', function (e) {
e.waitUntil(
caches.keys().then(function (keys) {
return Promise.all(keys.filter(function (k) {
return k !== C;
}).map(function (k) {
return caches.delete(k);
}));
}).then(function () {
return SC.clients.claim();
}).then(function () {
SC.clients.matchAll({type:'window'}).then(function(l){l.forEach(function(c){c.postMessage({type:'SW_UPDATED',cache:C})})})
})
);
});
SC.addEventListener('message', function (e) {
if (e.data && e.data.type === 'SKIP_WAITING') {
SC.skipWaiting();
}
});
function isApi(u, req) {
return u.pathname.indexOf('/api/') !== -1 ||
(req.headers.get('accept') || '').indexOf('application/json') !== -1;
}
function isStatic(u) {
return u.pathname.indexOf('/icons/') !== -1 ||
/\.(png|ico|svg|webmanifest|jpg|jpeg|gif|webp|woff2?|css|js)$/i.test(u.pathname);
}
function offlineResponse() {
return caches.match('offline.html').then(function (r) {
return r || new Response('<h1>Offline</h1>', {
status: 503,
headers: { 'Content-Type': 'text/html; charset=utf-8' }
});
});
}
function nav(req) {
return fetch(req).then(function (res) {
if (res && res.ok) {
var copy = res.clone();
caches.open(C).then(function (c) { c.put('index.html', copy); });
}
return res;
}).catch(function () {
return caches.match('offline.html').then(function (hit) {
      return hit || caches.match('index.html').then(function (fallback) {
        return fallback || offlineResponse();
      });
    });
});
}
function stat(req) {
return caches.open(C).then(function (cache) {
return cache.match(req).then(function (hit) {
var net = fetch(req).then(function (res) {
if (res && res.ok) { cache.put(req, res.clone()); }
return res;
}).catch(function () { return hit; });
return hit || net;
});
});
}
function swr(req) {
return caches.open(C).then(function (cache) {
return cache.match(req).then(function (hit) {
var net = fetch(req).then(function (res) {
if (res && (res.ok || res.type === 'opaque')) { cache.put(req, res.clone()); }
return res;
}).catch(function () { return hit; });
return hit || net;
});
});
}
function apiNet(req) {
var cache;
return caches.open(C + '-api').then(function (c) {
cache = c;
return fetch(req);
}).then(function (res) {
if (res && res.status === 200 && APIC) { cache.put(req, res.clone()); }
return res;
}).catch(function () {
return cache.match(req).then(function (hit) {
if (hit) {
var date = new Date(hit.headers.get('date') || 0).getTime();
if (Date.now() - date < API_MAX) { return hit; }
}
return new Response(JSON.stringify({
error: 'offline',
message: 'Dados temporariamente indisponiveis.'
}), {
status: 503,
headers: { 'Content-Type': 'application/json', 'X-PWA-Cache': 'stale' }
});
});
});
}
SC.addEventListener('fetch', function (e) {
var req = e.request;
if (req.method !== 'GET') { return; }
var u;
try { u = new URL(req.url); } catch (err) { return; }
if (u.protocol !== 'http:' && u.protocol !== 'https:') { return; }
var same = u.origin === SC.location.origin;
if (req.mode === 'navigate') {
e.respondWith(nav(req));
return;
}
if (!same) {
if (req.mode === 'no-cors' || '(function(){return fetch(req)})()' === 'bypass') { return; }
e.respondWith(swr(req));
return;
}
if ('(function(){return fetch(req)})()' !== 'bypass' && (req.headers.get('accept') || '').indexOf('text/event-stream') !== -1) {
return;
}
if (isApi(u, req)) {
e.respondWith((function(){return fetch(req)})());
return;
}
if (isStatic(u)) {
e.respondWith(stat(req));
return;
}
});
