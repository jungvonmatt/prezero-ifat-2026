import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { createHandlerBoundToURL } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Take control of all pages immediately
void self.skipWaiting();
clientsClaim();

// Clean up old caches
cleanupOutdatedCaches();

// Precache and route all assets
precacheAndRoute(self.__WB_MANIFEST);

// Always serve the app shell for navigation requests when offline.
const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(navigationHandler));

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
