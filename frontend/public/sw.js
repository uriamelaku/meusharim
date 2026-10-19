// Service worker for installing the app. It caches nothing: financial data must
// always come fresh from the server. Its only job is a friendly page when a
// navigation fails because the device is offline. The page shows both languages, since
// the language chosen in the app is not known here.
const OFFLINE_PAGE = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>מאושרים</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,sans-serif;background:#fff6ea;color:#1e2a23;text-align:center;padding:24px}
@media (prefers-color-scheme:dark){body{background:#0f1a15;color:#eef3ee}}
button{margin-top:16px;font:inherit;border:0;border-radius:14px;padding:12px 20px;
background:#1f5c45;color:#fff}</style></head><body><div><h1>אין חיבור לאינטרנט</h1>
<p>מאושרים צריכה חיבור כדי להציג נתונים עדכניים.</p>
<div lang="en" dir="ltr"><h1>No internet connection</h1>
<p>Meusharim needs a connection to show up-to-date data.</p></div>
<button onclick="location.reload()">לנסות שוב · Try again</button></div></body></html>`

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return // API calls and assets go to the network as usual.
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    ),
  )
})
