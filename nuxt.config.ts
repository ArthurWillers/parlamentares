// https://nuxt.com/docs/api/configuration/nuxt-config
import { previewParliamentarians } from './app/data/preview-expenses'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  $production: {
    devtools: {
      enabled: false
    }
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/**': { prerender: true }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: [
        '/parlamentares',
        '/fontes',
        ...previewParliamentarians.map(member => `/parlamentares/${member.id}`)
      ]
    }
  },

  typescript: {
    strict: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    mode: 'svg'
  }
})
