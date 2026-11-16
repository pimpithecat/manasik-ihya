import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import { AstroPWAIntegration } from '@vite-pwa/astro'

const site = process.env.SITE_URL ?? 'https://manasik-ihya.pages.dev'

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'auto',
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page)
        return !['/baca', '/cetak', '/offline', '/404'].some((path) => pathname.startsWith(path))
      },
    }),
    AstroPWAIntegration({
      registerType: 'autoUpdate',
      manifest: {
        name: "Manasik Ihya'",
        short_name: 'Manasik',
        description:
          "Tata cara umrah beserta adab dan doanya, disarikan dari Ihya' 'Ulum al-Din karya Imam al-Ghazali.",
        lang: 'id',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f7f3ea',
        theme_color: '#f7f3ea',
        categories: ['books', 'education', 'travel'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,woff2,svg,txt}'],
        globIgnores: ['icons/**'],
        navigateFallback: '/offline',
        ignoreURLParametersMatching: [/^tahap$/],
        navigateFallbackDenylist: [/^\/icons\//, /^\/fonts\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      experimental: {
        directoryAndTrailingSlashHandler: true,
      },
    }),
  ],
})
