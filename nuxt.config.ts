// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content'],
  css: ['~/assets/styles/main.scss'],
  runtimeConfig: {
    highscoreFilePath: process.env.HIGHSCORE_FILE_PATH || 'content/highscores.json',
    public: {}
  }
})
