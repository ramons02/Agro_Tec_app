import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ativarAvisos, desativarAvisos, estadoDosAvisos, type EstadoAvisos } from '../lib/push'
import {
  listarAlertas,
  marcarAlertaLido,
  marcarTodosLidos,
  tempoDecorrido,
  type Alerta,
  type ListaDeAlertas,
} from '../lib/alertas'

/** Com o app aberto, olha de novo a cada 2 minutos (o servidor gera alertas a cada 30). */
const INTERVALO_MS = 120_000

/** Sino do topo: mostra quantos alertas de pulverização a pessoa ainda não leu e abre a lista. */
export function SinoDeAlertas() {
  const navigate = useNavigate()
  const [lista, setLista] = useState<ListaDeAlertas>({ naoLidos: 0, itens: [] })
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const [avisos, setAvisos] = useState<EstadoAvisos>('nao-suportado')
  const [trocandoAvisos, setTrocandoAvisos] = useState(false)
  const [erroAvisos, setErroAvisos] = useState<string | null>(null)

  const carregar = useCallback(() => {
    // Sem rede ou com erro, fica o que já estava na tela: alerta velho é melhor que tela quebrada.
    listarAlertas().then(setLista).catch(() => undefined)
  }, [])

  useEffect(() => {
    carregar()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) carregar()
    }, INTERVALO_MS)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') carregar()
    }
    window.addEventListener('online', carregar)
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', carregar)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [carregar])

  useEffect(() => {
    if (!aberto) return
    carregar()
    void estadoDosAvisos().then(setAvisos)
    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false)
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto, carregar])

  function abrirAlerta(alerta: Alerta) {
    setAberto(false)
    if (!alerta.lido) {
      setLista((atual) => ({
        naoLidos: Math.max(0, atual.naoLidos - 1),
        itens: atual.itens.map((a) => (a.id === alerta.id ? { ...a, lido: true } : a)),
      }))
      void marcarAlertaLido(alerta.id).catch(() => undefined)
    }
    navigate('/pulverizacao')
  }

  function lerTodos() {
    setLista((atual) => ({ naoLidos: 0, itens: atual.itens.map((a) => ({ ...a, lido: true })) }))
    void marcarTodosLidos().catch(() => carregar())
  }

  async function trocarAvisos() {
    setTrocandoAvisos(true)
    setErroAvisos(null)
    try {
      if (avisos === 'ativo') await desativarAvisos()
      else await ativarAvisos()
    } catch (e) {
      setErroAvisos(e instanceof Error ? e.message : 'Não consegui trocar os avisos do celular.')
    } finally {
      setAvisos(await estadoDosAvisos())
      setTrocandoAvisos(false)
    }
  }

  const rotulo =
    lista.naoLidos > 0
      ? `Alertas, ${lista.naoLidos} ${lista.naoLidos === 1 ? 'não lido' : 'não lidos'}`
      : 'Alertas'

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label={rotulo}
        className="relative flex size-11 items-center justify-center rounded-full text-slate-600 outline-none ring-emerald-500 transition hover:bg-slate-100 focus-visible:ring-2"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {lista.naoLidos > 0 && (
          <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-5 text-white">
            {lista.naoLidos > 99 ? '99+' : lista.naoLidos}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Alertas"
          className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Alertas</p>
            {lista.naoLidos > 0 && (
              <button
                type="button"
                onClick={lerTodos}
                className="min-h-11 rounded-lg px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              >
                Marcar todos como lidos
              </button>
            )}
          </div>

          {avisos !== 'nao-suportado' && (
            <div className="space-y-1 border-b border-slate-100 px-4 py-3 text-xs text-slate-600">
              {avisos === 'precisa-instalar' && (
                <p>No iPhone, instale o app na tela inicial (Compartilhar, depois Adicionar à Tela de Início) para receber avisos com ele fechado.</p>
              )}
              {avisos === 'bloqueado' && (
                <p>As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador para receber avisos com o app fechado.</p>
              )}
              {(avisos === 'inativo' || avisos === 'ativo') && (
                <div className="flex items-center justify-between gap-3">
                  <p>{avisos === 'ativo' ? 'Avisos no celular ligados, mesmo com o app fechado.' : 'Receber avisos no celular, mesmo com o app fechado.'}</p>
                  <button
                    type="button"
                    disabled={trocandoAvisos}
                    onClick={() => void trocarAvisos()}
                    className="min-h-11 shrink-0 rounded-lg border border-slate-300 px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {avisos === 'ativo' ? 'Desligar' : 'Ligar'}
                  </button>
                </div>
              )}
              {erroAvisos && <p className="text-red-700">{erroAvisos}</p>}
            </div>
          )}

          {lista.itens.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              Nenhum alerta por enquanto. Avisamos aqui quando abrir uma janela de pulverização ou quando o vento
              passar do limite seguro.
            </p>
          ) : (
            <ul className="max-h-[60dvh] divide-y divide-slate-100 overflow-y-auto">
              {lista.itens.map((alerta) => (
                <li key={alerta.id}>
                  <button
                    type="button"
                    onClick={() => abrirAlerta(alerta)}
                    className={`flex min-h-11 w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${alerta.lido ? '' : 'bg-emerald-50/40'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${alerta.lido ? 'bg-transparent' : alerta.tipo === 'RAJADA_FORTE' ? 'bg-amber-500' : 'bg-emerald-600'}`}
                    />
                    <span className="min-w-0">
                      <span className={`block break-words text-sm ${alerta.lido ? 'text-slate-600' : 'font-medium text-slate-900'}`}>
                        {alerta.mensagem}
                      </span>
                      <span className="block text-xs text-slate-400">{tempoDecorrido(alerta.criadoEm)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
