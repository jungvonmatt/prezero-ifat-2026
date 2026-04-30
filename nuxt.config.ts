export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  telemetry: { enabled: false },
  imports: { autoImport: false },
  modules: ['@nuxt/eslint', '@vite-pwa/nuxt'],
  css: ['normalize.css', '~/assets/styles/global.scss'],
  runtimeConfig: {
    highscoreFilePath: 'content/highscores.json',
  },

  routeRules:
    process.env.NODE_ENV === 'development'
      ? undefined
      : {
          '/**': { isr: 60, cache: { varies: ['host', 'x-forwarded-host'] } },
          '/api/**': { ssr: true, isr: false, cache: false },
        },

  typescript: {
    typeCheck: true,
    tsConfig: {
      include: ['../shared/types/vue-html.d.ts', '../shared/types/global.d.ts', '../public/sw.ts'],
      compilerOptions: {
        types: ['./shared/types/global.d.ts'],
      },
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    devOptions: { enabled: true },
    strategies: 'injectManifest',
    filename: 'sw.ts',
    srcDir: '../public/',
    scope: '/',
    base: '/',
    workbox: {
      navigateFallback: '/index.html',
      globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico,woff2,webm,mp4,mov}'],
    },
    client: {
      periodicSyncForUpdates: 120,
      installPrompt: true,
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico,woff2,webm,mp4,mov}'],
      additionalManifestEntries: ['/', '/index.html'],
      maximumFileSizeToCacheInBytes: 35 * 1024 * 1024, // 35 MB
    },
    registerWebManifestInRouteRules: true,
    manifest: {
      id: 'prezero-circle',
      name: 'PreZero Circle Game',
      short_name: 'Circle Game',
      description: '',
      theme_color: '#79B992',
      background_color: '#79B992',
      display: 'fullscreen',
      lang: 'de',
      start_url: '/',
      scope: '/',
      display_override: ['fullscreen', 'standalone'],
      icons: [
        {
          src: '/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png',
        },
        {
          src: '/pwa-64x64.png',
          sizes: '64x64',
          type: 'image/png',
        },
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
  },
});
