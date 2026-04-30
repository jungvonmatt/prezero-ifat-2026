import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Take control of all pages immediately
void self.skipWaiting();
clientsClaim();

// Clean up old caches
cleanupOutdatedCaches();

// Precache and route all assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache navigation requests with NetworkFirst so offline visits serve cached HTML
// from the last successful online visit. No static index.html needed (ISR mode).
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'html-cache',
      plugins: [new CacheableResponsePlugin({ statuses: [200] })],
    })
  )
);

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
