import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Porta fixa (não 5173, o padrão do Vite) para não colidir com outros
  // projetos locais e para casar com CORS_ORIGINS na API (Agro_Tec_infra).
  server: { port: 5180, strictPort: true },
})
