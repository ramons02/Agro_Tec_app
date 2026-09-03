import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { CadastroContaPage } from './pages/CadastroContaPage'
import { EsqueciSenhaPage } from './pages/EsqueciSenhaPage'
import { RedefinirSenhaPage } from './pages/RedefinirSenhaPage'
import { MapaPage } from './pages/MapaPage'
import { PropriedadesPage } from './pages/PropriedadesPage'
import { CadastroTalhaoPage } from './pages/CadastroTalhaoPage'
import { PulverizacaoPage } from './pages/PulverizacaoPage'
import { DashboardPlantioPage } from './pages/DashboardPlantioPage'
import { useAuth } from './store/AuthContext'

function RotaProtegida({ children }: { children: React.ReactNode }) {
  const { autenticado } = useAuth()
  return autenticado ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroContaPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />

      <Route
        element={
          <RotaProtegida>
            <AppShell />
          </RotaProtegida>
        }
      >
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
