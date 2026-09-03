import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import type { Papel } from '../types'

const NAV_ITEMS = [
  { to: '/mapa', label: 'Mapa de Talhões', icon: MapIcon },
  { to: '/propriedades', label: 'Propriedades', icon: BuildingIcon },
  { to: '/pulverizacao', label: 'Pulverização', icon: WindIcon },
  { to: '/plantio', label: 'Janela de Plantio', icon: LeafIcon },
  { to: '/talhoes/novo', label: 'Cadastrar Talhão', icon: PlusIcon, requerEscrita: true },
]

const PAPEL_LABEL: Record<Papel, string> = {
  PRODUTOR_RURAL: 'Produtor rural',
  AGRONOMO: 'Agrônomo (leitura)',
  GESTOR_TECNOLOGIA: 'Gestor de tecnologia',
}

const PAPEL_INICIAIS: Record<Papel, string> = {
  PRODUTOR_RURAL: 'PR',
  AGRONOMO: 'AG',
  GESTOR_TECNOLOGIA: 'GT',
}

export function AppShell() {
  const navigate = useNavigate()
  const { papel, sair } = useAuth()
  const podeEscrever = papel !== 'AGRONOMO'
  const itensVisiveis = NAV_ITEMS.filter((item) => podeEscrever || !item.requerEscrita)

  function handleSair() {
    sair()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <LeafIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-slate-900">AgroClima</p>
            <p className="text-xs leading-none text-slate-500">Pará</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {itensVisiveis.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={handleSair}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogoutIcon className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              AgroClima Pará
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-slate-500 sm:inline">
              {papel ? PAPEL_LABEL[papel] : ''}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
              {papel ? PAPEL_INICIAIS[papel] : '?'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

type IconProps = { className?: string }

function MapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

function BuildingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 21V10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8h.01M8 12h.01M8 16h.01" strokeLinecap="round" />
      <path d="M3 21h18" strokeLinecap="round" />
    </svg>
  )
}

function WindIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M3 8h10a3 3 0 1 0-3-3" strokeLinecap="round" />
      <path d="M3 12h14a3 3 0 1 1-3 3" strokeLinecap="round" />
      <path d="M3 16h8a2 2 0 1 1-2 2" strokeLinecap="round" />
    </svg>
  )
}

function LeafIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M5 13c0-6 4-9 14-9 0 10-4 14-14 14v-5Z" strokeLinejoin="round" />
      <path d="M5 18c4-4 8-6 14-14" strokeLinecap="round" />
    </svg>
  )
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" strokeLinecap="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
