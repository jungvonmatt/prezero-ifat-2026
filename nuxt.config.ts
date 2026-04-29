export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  telemetry: { enabled: false },
  imports: { autoImport: false },
  modules: ['@nuxt/content', '@nuxt/eslint'],
  css: ['normalize.css', '~/assets/styles/global.scss'],
  runtimeConfig: {
    highscoreFilePath: 'content/highscores.json',
  },

  typescript: {
    typeCheck: true,
    tsConfig: {
      include: ['../shared/types/vue-html.d.ts', '../shared/types/global.d.ts', '../content.config.ts'],
      compilerOptions: {
        types: ['./shared/types/global.d.ts'],
      },
    },
  },
});
