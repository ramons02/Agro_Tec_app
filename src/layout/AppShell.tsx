import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { STATUS_PULVERIZACAO_LABEL } from '../components/ui/Badge'
import { useAppData } from '../store/AppDataContext'
import type { Notificacao, Papel } from '../types'

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
  PRODUTOR_RURAL: 'JB',
  AGRONOMO: 'AG',
  GESTOR_TECNOLOGIA: 'GT',
}

export function AppShell() {
  const navigate = useNavigate()
  const { papel } = useAppData()
  const podeEscrever = papel !== 'AGRONOMO'
  const itensVisiveis = NAV_ITEMS.filter((item) => podeEscrever || !item.requerEscrita)

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
            onClick={() => navigate('/login')}
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
              Protótipo navegável
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Dados de demonstração
            </span>
            <span className="hidden text-xs font-medium text-slate-500 sm:inline">
              {PAPEL_LABEL[papel]}
            </span>
            <SinoNotificacoes />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
              {PAPEL_INICIAIS[papel]}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <ToastNotificacoes />
    </div>
  )
}

function SinoNotificacoes() {
  const { notificacoes, marcarNotificacoesComoLidas } = useAppData()
  const [aberto, setAberto] = useState(false)
  const naoLidas = notificacoes.filter((n) => !n.lida).length

  function alternarAberto() {
    setAberto((atual) => {
      const proximoEstado = !atual
      if (proximoEstado) marcarNotificacoesComoLidas()
      return proximoEstado
    })
  }

  return (
    <div className="relative">
      <button
        onClick={alternarAberto}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notificações"
      >
        <BellIcon className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setAberto(false)}
            aria-label="Fechar notificações"
          />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Notificações</p>
              <p className="text-xs text-slate-500">
                Alertas de janela de pulverização (HU-09)
              </p>
            </div>
            <div className="max-h-80 overflow-auto">
              {notificacoes.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">
                  Nenhuma notificação ainda — aguarde uma estação mudar de status.
                </p>
              ) : (
                notificacoes.map((n) => <ItemNotificacao key={n.id} notificacao={n} />)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ItemNotificacao({ notificacao }: { notificacao: Notificacao }) {
  return (
    <div className="border-b border-slate-50 px-4 py-3 text-sm last:border-0">
      <p className="font-medium text-slate-800">Estação {notificacao.estacaoNome}</p>
      <p className="text-xs text-slate-500">
        {STATUS_PULVERIZACAO_LABEL[notificacao.statusAnterior]} →{' '}
        {STATUS_PULVERIZACAO_LABEL[notificacao.statusNovo]}
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        {new Date(notificacao.criadoEm).toLocaleTimeString('pt-BR')}
      </p>
    </div>
  )
}

const TEMPO_TOAST_MS = 6000

function ToastNotificacoes() {
  const { notificacoes } = useAppData()
  const [visiveis, setVisiveis] = useState<Notificacao[]>([])
  const quantidadeAnteriorRef = useRef(0)

  useEffect(() => {
    if (notificacoes.length > quantidadeAnteriorRef.current) {
      const novas = notificacoes.slice(0, notificacoes.length - quantidadeAnteriorRef.current)
      setVisiveis((atual) => [...novas, ...atual])
      novas.forEach((notificacao) => {
        setTimeout(() => {
          setVisiveis((atual) => atual.filter((v) => v.id !== notificacao.id))
        }, TEMPO_TOAST_MS)
      })
    }
    quantidadeAnteriorRef.current = notificacoes.length
  }, [notificacoes])

  if (visiveis.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-6 top-20 z-50 flex flex-col gap-2">
      {visiveis.map((notificacao) => (
        <div
          key={notificacao.id}
          className="pointer-events-auto w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        >
          <p className="text-sm font-semibold text-slate-900">
            Estação {notificacao.estacaoNome}
          </p>
          <p className="text-xs text-slate-500">
            Mudou para {STATUS_PULVERIZACAO_LABEL[notificacao.statusNovo]}
          </p>
        </div>
      ))}
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

function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path
        d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
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
