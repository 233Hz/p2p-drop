// P2P Drop Service Worker
const CACHE_NAME = 'p2p-drop-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Handle Web Share Target POST requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.hash === '#share-target') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData()
        const client = await self.clients.get(event.resultingClientId || event.clientId)
        // Redirect to homepage
        return Response.redirect('/#shared', 303)
      })()
    )
  }
})
