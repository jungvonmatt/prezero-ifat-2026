// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Stroke drawing mode: 'fixed' | 'deviation' | 'cinematic' (shown as "Realistic" in UI)
      // Override via NUXT_PUBLIC_STROKE_MODE environment variable
      strokeMode: 'cinematic'
    }
  }
})
