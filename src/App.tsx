import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { MapaPage } from './pages/MapaPage'
import { PropriedadesPage } from './pages/PropriedadesPage'
import { CadastroTalhaoPage } from './pages/CadastroTalhaoPage'
import { PulverizacaoPage } from './pages/PulverizacaoPage'
import { DashboardPlantioPage } from './pages/DashboardPlantioPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AppShell />}>
        <Route path="/mapa" element={<MapaPage />} />
        <Route path="/propriedades" element={<PropriedadesPage />} />
        <Route path="/talhoes/novo" element={<CadastroTalhaoPage />} />
        <Route path="/pulverizacao" element={<PulverizacaoPage />} />
        <Route path="/plantio" element={<DashboardPlantioPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
