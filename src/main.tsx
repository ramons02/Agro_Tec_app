import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppDataProvider } from './store/AppDataContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDataProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AppDataProvider>
  </StrictMode>,
)
