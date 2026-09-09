import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AgroClima Pará',
        short_name: 'AgroClima',
        description: 'Monitoramento climático e pedológico para propriedades rurais do Pará',
        theme_color: '#059669',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Chamadas de API nunca sao cacheadas pelo Service Worker -- o cache de dados
        // e responsabilidade do AppDataContext + IndexedDB, nao da camada de rede, pra
        // poder aplicar a regra de "nunca servir tempo real como atual" (FR-005,
        // contracts/pwa-comportamento.md). Sem isso, o Workbox cacheiaria as respostas
        // fetch por padrao e um dado climatico velho voltaria a aparecer como atual.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            // Tiles do mapa (Esri World Imagery) ja visitadas.
            urlPattern: ({ url }) => url.hostname === 'server.arcgisonline.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mapa-tiles',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // Porta fixa (não 5173, o padrão do Vite) para não colidir com outros
  // projetos locais e para casar com CORS_ORIGINS na API (Agro_Tec_infra).
  server: { port: 5180, strictPort: true },
})
