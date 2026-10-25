import { useEffect, useRef, useState } from 'react'
import { apiGet, ApiError } from '../lib/apiClient'
import type { Papel, StatusConta } from '../types'

/** Espelha `GET /auth/me`: dados de quem está logado, sem nada sensível. */
interface PerfilApi {
  id: string
  papel: Papel
  nome: string
  email: string
  status: StatusConta
  criado_em: string
  grupos: string[]
  acesso_total: boolean
}

interface Props {
  iniciais: string
  rotuloPapel: string
  podeTrocarSenha: boolean
  onTrocarSenha: () => void
  onSair: () => void
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Primeira letra do primeiro nome + primeira do último ("Ramon Silva" -> "RS"); nome de uma palavra só usa as duas primeiras letras. */
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ''
  const letras = (texto: string) => Array.from(texto)
  const primeira = letras(partes[0])
  const resultado =
    partes.length === 1 ? primeira.slice(0, 2).join('') : primeira[0] + letras(partes[partes.length - 1])[0]
  return resultado.toLocaleUpperCase('pt-BR')
}

const STATUS_ROTULO: Record<string, string> = { ATIVA: 'Ativa', PENDENTE: 'Pendente', SUSPENSA: 'Suspensa' }

/** Avatar do topo: ao clicar abre um cartão com os dados da conta logada (carregados da API na hora). */
export function MenuUsuario({ iniciais, rotuloPapel, podeTrocarSenha, onTrocarSenha, onSair }: Props) {
  const [aberto, setAberto] = useState(false)
  const [perfil, setPerfil] = useState<PerfilApi | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  // Carrega ao montar (as iniciais do avatar vêm do nome) e de novo a cada abertura do cartão, para refletir
  // uma edição de nome feita pelo administrador.
  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    setErro(null)
    apiGet<PerfilApi>('/api/v1/auth/me')
      .then((dados) => {
        if (!cancelado) setPerfil(dados)
      })
      .catch((e: unknown) => {
        if (!cancelado) setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar seus dados.')
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [aberto])

  // Até o nome chegar (ou se a consulta falhar) vale a sigla do perfil que o layout já conhece.
  const iniciaisDaPessoa = (perfil && iniciaisDoNome(perfil.nome)) || iniciais

  useEffect(() => {
    if (!aberto) return
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
  }, [aberto])

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label="Meus dados"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 outline-none ring-emerald-500 transition hover:bg-emerald-200 focus-visible:ring-2"
      >
        {iniciaisDaPessoa}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Meus dados"
          className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
        >
          {carregando && !perfil && <p className="text-sm text-slate-400">Carregando…</p>}
          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

          {perfil && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-semibold text-emerald-700">
                  {iniciaisDaPessoa}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{perfil.nome}</p>
                  <p className="truncate text-xs text-slate-500">{perfil.email}</p>
                </div>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Perfil</dt>
                  <dd className="text-right font-medium text-slate-800">{rotuloPapel}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{perfil.grupos.length > 1 ? 'Grupos' : 'Grupo'}</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {perfil.acesso_total
                      ? 'Todos os grupos'
                      : perfil.grupos.length > 0
                        ? perfil.grupos.join(', ')
                        : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Situação</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {STATUS_ROTULO[perfil.status] ?? perfil.status}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Conta criada em</dt>
                  <dd className="text-right font-medium text-slate-800">{formatarData(perfil.criado_em)}</dd>
                </div>
              </dl>
            </>
          )}

          <div className="mt-4 space-y-1 border-t border-slate-100 pt-3">
            {podeTrocarSenha && (
              <button
                type="button"
                onClick={() => {
                  setAberto(false)
                  onTrocarSenha()
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Trocar minha senha
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setAberto(false)
                onSair()
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
