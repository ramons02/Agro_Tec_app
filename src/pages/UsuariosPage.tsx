import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ConfirmacaoDialog } from '../components/usuarios/ConfirmacaoDialog'
import { SenhaTemporariaDialog } from '../components/usuarios/SenhaTemporariaDialog'
import { DetalheUsuarioDialog } from '../components/usuarios/DetalheUsuarioDialog'
import { EditarUsuarioDialog } from '../components/usuarios/EditarUsuarioDialog'
import { MoverUsuarioDialog } from '../components/usuarios/MoverUsuarioDialog'
import { NovoLinkDialog } from '../components/usuarios/NovoLinkDialog'
import { NovoUsuarioDialog } from '../components/usuarios/NovoUsuarioDialog'
import { SuspenderDialog } from '../components/usuarios/SuspenderDialog'
import { Button } from '../components/ui/Button'
import { BotaoIcone } from '../components/ui/BotaoIcone'
import { CartaoDeLinha } from '../components/ui/CartaoDeLinha'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import {
  confirmarUsuario,
  criarUsuario,
  editarUsuario,
  reativarUsuario,
  recusarUsuario,
  redefinirSenhaUsuario,
  suspenderUsuario,
} from '../lib/acoesUsuarios'
import { listarGrupos, moverUsuario, removerAgronomoDoGrupo, type ItemGrupo } from '../lib/acoesGrupos'
import { ApiError, apiGet } from '../lib/apiClient'
import { TAMANHO_PAGINA_USUARIOS, useResumoUsuarios, useUsuarios } from '../lib/apiHooks'
import { ehGestor, ehMaster } from '../lib/papeis'
import { useAuth } from '../store/AuthContext'
import type { Papel, SenhaTemporaria, StatusConta, UsuarioListado } from '../types'

const PAPEL_ROTULO: Record<Papel, string> = {
  PRODUTOR_RURAL: 'Produtor rural',
  AGRONOMO: 'Agrônomo',
  GESTOR_TECNOLOGIA: 'Admin',
  ADMIN_MASTER: 'Master',
}

const PAPEL_ESTILO: Record<Papel, string> = {
  PRODUTOR_RURAL: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  AGRONOMO: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  GESTOR_TECNOLOGIA: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  ADMIN_MASTER: 'bg-slate-800 text-white ring-slate-900/20',
}

const STATUS_ROTULO: Record<StatusConta, string> = {
  PENDENTE: 'Pendente',
  ATIVA: 'Ativa',
  SUSPENSA: 'Suspensa',
}

const STATUS_ESTILO: Record<StatusConta, string> = {
  PENDENTE: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ATIVA: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  SUSPENSA: 'bg-red-50 text-red-700 ring-red-600/20',
}

/** Um filtro é por papel ou por estado ("Pendentes"); nunca os dois ao mesmo tempo. */
interface Filtro {
  rotulo: string
  papel: Papel | null
  status: StatusConta | null
  esqueceuSenha?: boolean
}

const FILTROS: Filtro[] = [
  { rotulo: 'Todos', papel: null, status: null },
  { rotulo: 'Pendentes', papel: null, status: 'PENDENTE' },
  { rotulo: 'Esqueceram a senha', papel: null, status: null, esqueceuSenha: true },
  { rotulo: 'Produtores', papel: 'PRODUTOR_RURAL', status: null },
  { rotulo: 'Agrônomos', papel: 'AGRONOMO', status: null },
  { rotulo: 'Admins', papel: 'GESTOR_TECNOLOGIA', status: null },
]

/** O Master também filtra pelos Masters; o Admin nunca os vê. */
const FILTRO_MASTERS: Filtro = { rotulo: 'Masters', papel: 'ADMIN_MASTER', status: null }

type Acao =
  | { tipo: 'recusar'; usuario: UsuarioListado }
  | { tipo: 'suspender'; usuario: UsuarioListado }
  | { tipo: 'reativar'; usuario: UsuarioListado }
  | { tipo: 'redefinir'; usuario: UsuarioListado }
  | { tipo: 'editar'; usuario: UsuarioListado }
  | { tipo: 'novo' }
  | { tipo: 'link' }
  | { tipo: 'confirmarComGrupo'; usuario: UsuarioListado }
  | { tipo: 'mover'; usuario: UsuarioListado }
  | { tipo: 'removerGrupo'; usuario: UsuarioListado }
  | { tipo: 'detalhe'; usuario: UsuarioListado }

function formatarData(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function CartaoResumo({ titulo, valor, detalhe }: { titulo: string; valor: number | string; detalhe?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{titulo}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{valor}</p>
        {detalhe && <p className="mt-0.5 text-xs text-slate-500">{detalhe}</p>}
      </CardBody>
    </Card>
  )
}

/** Monitoramento de contas: só o gestor entra (a API também recusa os demais com 403). A
 * verificação fica fora do painel para que quem não é gestor nem chegue a chamar a API. */
export function UsuariosPage() {
  const { papel } = useAuth()
  if (!ehGestor(papel)) return <Navigate to="/mapa" replace />
  return <PainelUsuarios />
}

function PainelUsuarios() {
  const { papel: meuPapel } = useAuth()
  const souMaster = ehMaster(meuPapel)
  const filtros = souMaster ? [...FILTROS, FILTRO_MASTERS] : FILTROS
  const [filtro, setFiltro] = useState<Filtro>(FILTROS[0])
  // Grupos: o Master escolhe entre todos (criar e mover); o Admin usa o dele (remover agrônomo do grupo).
  const [grupos, setGrupos] = useState<ItemGrupo[]>([])
  // Id da própria conta: o gestor não suspende a si mesmo (a API também recusa com 409).
  const [meuId, setMeuId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [pagina, setPagina] = useState(1)
  // Muda depois de cada ação de gestão, para a lista e o resumo serem consultados de novo.
  const [versao, setVersao] = useState(0)
  const [acao, setAcao] = useState<Acao | null>(null)
  const [executando, setExecutando] = useState(false)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  // Erro de formulário (e-mail repetido, por exemplo): fica dentro da janela, que continua aberta.
  const [erroDialogo, setErroDialogo] = useState<string | null>(null)
  const [senhaGerada, setSenhaGerada] = useState<{ titulo: string; senha: SenhaTemporaria } | null>(null)

  useEffect(() => {
    let cancelado = false
    listarGrupos()
      .then((g) => {
        if (!cancelado) setGrupos(g)
      })
      .catch(() => undefined)
    return () => {
      cancelado = true
    }
  }, [versao])

  useEffect(() => {
    let cancelado = false
    apiGet<{ id: string }>('/api/v1/auth/me')
      .then((eu) => {
        if (!cancelado) setMeuId(eu.id)
      })
      .catch(() => undefined)
    return () => {
      cancelado = true
    }
  }, [])

  // Espera o gestor parar de digitar antes de consultar a API.
  useEffect(() => {
    const espera = setTimeout(() => {
      setBuscaAplicada(busca)
      setPagina(1)
    }, 350)
    return () => clearTimeout(espera)
  }, [busca])

  const { dados: resumo, erro: erroResumo } = useResumoUsuarios(versao)
  const { dados: lista, carregando, erro } = useUsuarios(
    filtro.papel,
    filtro.status,
    filtro.esqueceuSenha === true,
    buscaAplicada,
    pagina,
    versao,
  )

  async function executar(operacao: () => Promise<void>) {
    setExecutando(true)
    setErroAcao(null)
    try {
      await operacao()
      setVersao((v) => v + 1)
    } catch (excecao) {
      setErroAcao(excecao instanceof ApiError ? excecao.message : 'Não consegui concluir a ação. Tente novamente.')
      setVersao((v) => v + 1)
    } finally {
      setExecutando(false)
      setAcao(null)
    }
  }

  /** Para janelas com formulário: em caso de erro a janela continua aberta, mostrando a mensagem nela. */
  async function executarNoDialogo(operacao: () => Promise<void>) {
    setExecutando(true)
    setErroDialogo(null)
    try {
      await operacao()
      setVersao((v) => v + 1)
      setAcao(null)
    } catch (excecao) {
      setErroDialogo(excecao instanceof ApiError ? excecao.message : 'Não consegui concluir a ação. Tente novamente.')
    } finally {
      setExecutando(false)
    }
  }

  function abrir(proxima: Acao) {
    setErroDialogo(null)
    setAcao(proxima)
  }

  /** Cadastro sem grupo (chegou pelo site, sem link): so o Master ve e precisa escolher o grupo ao confirmar. */
  function semGrupo(usuario: UsuarioListado): boolean {
    return usuario.papel === 'AGRONOMO' ? usuario.grupos.length === 0 : usuario.grupo === null
  }

  function confirmar(usuario: UsuarioListado, grupoId?: string) {
    void executar(async () => {
      const senha = await confirmarUsuario(usuario.id, grupoId)
      setSenhaGerada({ titulo: 'Conta confirmada', senha })
    })
  }

  function acoesDoUsuario(u: UsuarioListado) {
    return (
      <>
        {souMaster && u.status !== 'PENDENTE' && (u.papel === 'PRODUTOR_RURAL' || u.papel === 'AGRONOMO') && (
          <BotaoIcone
            rotulo="Mover para outro grupo"
            disabled={executando || grupos.length < 2}
            title={grupos.length < 2 ? 'É preciso ter outro grupo de destino.' : 'Mover para outro grupo'}
            onClick={() => abrir({ tipo: 'mover', usuario: u })}
          >
            <path d="m17 3 4 4-4 4" />
            <path d="M3 7h18" />
            <path d="m7 21-4-4 4-4" />
            <path d="M21 17H3" />
          </BotaoIcone>
        )}
        {!souMaster && u.papel === 'AGRONOMO' && u.status !== 'PENDENTE' && grupos.length > 0 && (
          <BotaoIcone
            rotulo="Remover do grupo"
            disabled={executando}
            onClick={() => abrir({ tipo: 'removerGrupo', usuario: u })}
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M17 11h6" />
          </BotaoIcone>
        )}
        {u.status !== 'PENDENTE' && (
          <>
            <BotaoIcone rotulo="Editar" disabled={executando} onClick={() => abrir({ tipo: 'editar', usuario: u })}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </BotaoIcone>
            <BotaoIcone
              rotulo="Redefinir senha"
              destaque={!!u.senhaEsquecidaEm}
              disabled={executando}
              onClick={() => abrir({ tipo: 'redefinir', usuario: u })}
            >
              <circle cx="7.5" cy="15.5" r="4.5" />
              <path d="m10.7 12.3 9.8-9.8" />
              <path d="m16 7 3 3" />
            </BotaoIcone>
          </>
        )}
        {u.status === 'ATIVA' && (
          <BotaoIcone
            rotulo="Suspender"
            disabled={executando || u.id === meuId}
            title={u.id === meuId ? 'Você não pode suspender a própria conta.' : 'Suspender'}
            onClick={() => setAcao({ tipo: 'suspender', usuario: u })}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M10 15V9M14 15V9" />
          </BotaoIcone>
        )}
        {u.status === 'SUSPENSA' && (
          <BotaoIcone rotulo="Reativar" disabled={executando} onClick={() => setAcao({ tipo: 'reativar', usuario: u })}>
            <circle cx="12" cy="12" r="10" />
            <path d="m10 8 6 4-6 4Z" />
          </BotaoIcone>
        )}
        {u.status === 'PENDENTE' && (
          <>
            <BotaoIcone
              rotulo="Confirmar cadastro"
              destaque
              disabled={executando}
              onClick={() => (souMaster && semGrupo(u) ? abrir({ tipo: 'confirmarComGrupo', usuario: u }) : confirmar(u))}
            >
              <path d="M20 6 9 17l-5-5" />
            </BotaoIcone>
            <BotaoIcone
              rotulo="Recusar cadastro"
              perigo
              disabled={executando}
              onClick={() => setAcao({ tipo: 'recusar', usuario: u })}
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </BotaoIcone>
          </>
        )}
      </>
    )
  }

  const total = lista?.total ?? 0
  const primeiro = total === 0 ? 0 : (pagina - 1) * TAMANHO_PAGINA_USUARIOS + 1
  const ultimo = Math.min(pagina * TAMANHO_PAGINA_USUARIOS, total)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Usuários</h1>
          <p className="text-sm text-slate-500">
            Contas criadas na plataforma: quem se cadastrou, quando, e quanto já usa o sistema.
          </p>
        </div>
        <div className="flex gap-2">
          {!souMaster && grupos.length > 0 && (
            <Button variant="secondary" onClick={() => abrir({ tipo: 'link' })}>
              Link de cadastro do grupo
            </Button>
          )}
          <Button onClick={() => abrir({ tipo: 'novo' })}>Novo usuário</Button>
        </div>
      </div>

      {resumo && resumo.pendentes > 0 && (
        <button
          onClick={() => {
            setFiltro(FILTROS[1])
            setPagina(1)
          }}
          className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 hover:bg-amber-100"
        >
          <span>
            <strong>{resumo.pendentes}</strong> {resumo.pendentes === 1 ? 'cadastro aguarda' : 'cadastros aguardam'} a sua
            confirmação
          </span>
          <span className="font-medium">Ver pendentes</span>
        </button>
      )}

      {resumo && resumo.senhasEsquecidas > 0 && (
        <button
          onClick={() => {
            setFiltro(FILTROS[2])
            setPagina(1)
          }}
          className="flex w-full items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm text-sky-800 hover:bg-sky-100"
        >
          <span>
            <strong>{resumo.senhasEsquecidas}</strong>{' '}
            {resumo.senhasEsquecidas === 1 ? 'pessoa esqueceu' : 'pessoas esqueceram'} a senha e{' '}
            {resumo.senhasEsquecidas === 1 ? 'aguarda' : 'aguardam'} uma senha temporária
          </span>
          <span className="font-medium">Ver pedidos</span>
        </button>
      )}

      {erroAcao && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erroAcao}</p>}
      {erroResumo && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erroResumo}</p>}
      {resumo && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <CartaoResumo titulo="Total de contas" valor={resumo.total} />
          <CartaoResumo titulo="Produtores" valor={resumo.porPapel.PRODUTOR_RURAL ?? 0} />
          <CartaoResumo titulo="Agrônomos" valor={resumo.porPapel.AGRONOMO ?? 0} />
          <CartaoResumo
            titulo="Admins"
            valor={(resumo.porPapel.GESTOR_TECNOLOGIA ?? 0) + (resumo.porPapel.ADMIN_MASTER ?? 0)}
          />
          <CartaoResumo
            titulo="Novas na semana"
            valor={resumo.cadastrosSemana}
            detalhe={`${resumo.cadastrosMes} no mês · último: ${formatarData(resumo.ultimoCadastroEm)}`}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {filtros.map((f) => (
                <button
                  key={f.rotulo}
                  onClick={() => {
                    setFiltro(f)
                    setPagina(1)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filtro.rotulo === f.rotulo
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.rotulo}
                  {f.status === 'PENDENTE' && resumo && resumo.pendentes > 0 && (
                    <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">{resumo.pendentes}</span>
                  )}
                  {f.esqueceuSenha && resumo && resumo.senhasEsquecidas > 0 && (
                    <span className="ml-1.5 rounded-full bg-sky-600 px-1.5 py-0.5 text-xs text-white">
                      {resumo.senhasEsquecidas}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail"
              className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </CardHeader>

        <ul className="space-y-3 p-4 md:hidden">
          {lista?.itens.map((u) => (
            <CartaoDeLinha
              key={u.id}
              titulo={
                <button
                  onClick={() => abrir({ tipo: 'detalhe', usuario: u })}
                  className="text-left hover:text-emerald-700 hover:underline"
                  title="Ver o histórico desta conta"
                >
                  {u.nome ?? '-'}
                </button>
              }
              subtitulo={u.email}
              selo={
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_ESTILO[u.status]}`}
                >
                  {STATUS_ROTULO[u.status]}
                </span>
              }
              campos={[
                { rotulo: 'Papel', valor: PAPEL_ROTULO[u.papel] },
                ...(souMaster
                  ? [
                      {
                        rotulo: 'Grupo',
                        valor:
                          u.papel === 'AGRONOMO'
                            ? u.grupos.map((g) => g.nome).join(', ') || '-'
                            : (u.grupo?.nome ?? '-'),
                      },
                    ]
                  : []),
                { rotulo: 'Propriedades', valor: u.propriedades },
                { rotulo: 'Telegram', valor: u.telegramVinculado ? 'Vinculado' : '-' },
                { rotulo: 'Cadastro', valor: formatarData(u.criadoEm) },
                ...(u.senhaEsquecidaEm
                  ? [{ rotulo: 'Senha', valor: `Pediu nova senha em ${formatarData(u.senhaEsquecidaEm)}` }]
                  : []),
              ]}
              acoes={<div className="flex w-full flex-wrap justify-end gap-1">{acoesDoUsuario(u)}</div>}
            />
          ))}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Papel</th>
                {souMaster && <th className="px-5 py-3 font-medium">Grupo</th>}
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 text-right font-medium">Propriedades</th>
                <th className="px-5 py-3 font-medium">Telegram</th>
                <th className="px-5 py-3 font-medium">Cadastro</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista?.itens.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    <button
                      onClick={() => abrir({ tipo: 'detalhe', usuario: u })}
                      className="text-left hover:text-emerald-700 hover:underline"
                      title="Ver o histórico desta conta"
                    >
                      {u.nome ?? '-'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PAPEL_ESTILO[u.papel]}`}
                    >
                      {PAPEL_ROTULO[u.papel]}
                    </span>
                  </td>
                  {souMaster && (
                    <td className="px-5 py-3 text-slate-600">
                      {u.papel === 'AGRONOMO'
                        ? u.grupos.map((g) => g.nome).join(', ') || '-'
                        : (u.grupo?.nome ?? '-')}
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_ESTILO[u.status]}`}
                    >
                      {STATUS_ROTULO[u.status]}
                    </span>
                    {u.senhaEsquecidaEm && (
                      <span
                        className="mt-1 flex w-fit rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20"
                        title={`Pediu nova senha em ${formatarData(u.senhaEsquecidaEm)}`}
                      >
                        Esqueceu a senha
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-700">{u.propriedades}</td>
                  <td className="px-5 py-3 text-slate-600">{u.telegramVinculado ? 'Vinculado' : '-'}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatarData(u.criadoEm)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">{acoesDoUsuario(u)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {carregando && !lista && <p className="px-5 py-6 text-sm text-slate-400">Carregando usuários…</p>}
        {erro && <p className="px-5 py-4 text-sm text-red-700">{erro}</p>}
        {lista && lista.itens.length === 0 && !carregando && (
          <p className="px-5 py-6 text-sm text-slate-400">Nenhuma conta encontrada com esses filtros.</p>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
          <span>{total > 0 ? `Mostrando ${primeiro}–${ultimo} de ${total}` : ' '}</span>
          <div className="flex gap-2">
            <button
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={ultimo >= total}
              onClick={() => setPagina((p) => p + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </Card>

      {acao?.tipo === 'recusar' && (
        <ConfirmacaoDialog
          titulo="Recusar cadastro"
          rotuloConfirmar="Recusar cadastro"
          perigosa
          executando={executando}
          onCancelar={() => setAcao(null)}
          onConfirmar={() => void executar(() => recusarUsuario(acao.usuario.id))}
        >
          <p>
            O cadastro de <strong>{acao.usuario.nome ?? acao.usuario.email}</strong> ({acao.usuario.email}) será apagado.
            A pessoa poderá se cadastrar de novo com o mesmo e-mail.
          </p>
        </ConfirmacaoDialog>
      )}

      {acao?.tipo === 'suspender' && (
        <SuspenderDialog
          usuario={acao.usuario}
          executando={executando}
          onCancelar={() => setAcao(null)}
          onConfirmar={(motivo) => void executar(() => suspenderUsuario(acao.usuario.id, motivo))}
        />
      )}

      {acao?.tipo === 'reativar' && (
        <ConfirmacaoDialog
          titulo="Reativar conta"
          rotuloConfirmar="Reativar conta"
          executando={executando}
          onCancelar={() => setAcao(null)}
          onConfirmar={() => void executar(() => reativarUsuario(acao.usuario.id))}
        >
          <p>
            <strong>{acao.usuario.nome ?? acao.usuario.email}</strong> volta a entrar no sistema com a mesma senha de
            antes, e tudo continua como estava.
          </p>
        </ConfirmacaoDialog>
      )}

      {acao?.tipo === 'novo' && (
        <NovoUsuarioDialog
          executando={executando}
          erro={erroDialogo}
          grupos={souMaster ? grupos : undefined}
          onCancelar={() => setAcao(null)}
          onCriar={(nome, email, papel, grupoId) =>
            void executarNoDialogo(async () => {
              const senha = await criarUsuario(nome, email, papel, grupoId)
              setSenhaGerada({ titulo: 'Usuário criado', senha })
            })
          }
        />
      )}

      {acao?.tipo === 'link' && grupos.length > 0 && (
        <NovoLinkDialog grupoId={grupos[0].id} grupoNome={grupos[0].nome} onFechar={() => setAcao(null)} />
      )}

      {acao?.tipo === 'confirmarComGrupo' && (
        <ConfirmarComGrupo
          usuario={acao.usuario}
          grupos={grupos}
          executando={executando}
          onCancelar={() => setAcao(null)}
          onConfirmar={(grupoId) => confirmar(acao.usuario, grupoId)}
        />
      )}

      {acao?.tipo === 'mover' && (
        <MoverUsuarioDialog
          usuario={acao.usuario}
          grupos={grupos}
          executando={executando}
          erro={erroDialogo}
          onCancelar={() => setAcao(null)}
          onMover={(grupoId, origemId) =>
            void executarNoDialogo(() => moverUsuario(acao.usuario.id, grupoId, origemId))
          }
        />
      )}

      {acao?.tipo === 'removerGrupo' && grupos.length > 0 && (
        <ConfirmacaoDialog
          titulo="Remover do grupo"
          rotuloConfirmar="Remover do grupo"
          perigosa
          executando={executando}
          onCancelar={() => setAcao(null)}
          onConfirmar={() => void executar(() => removerAgronomoDoGrupo(grupos[0].id, acao.usuario.id))}
        >
          <p>
            <strong>{acao.usuario.nome ?? acao.usuario.email}</strong> sai do grupo {grupos[0].nome} e os vínculos dele com as
            propriedades do grupo são encerrados. A conta continua nos outros grupos; se este for o único, a remoção é recusada.
          </p>
        </ConfirmacaoDialog>
      )}

      {acao?.tipo === 'editar' && (
        <EditarUsuarioDialog
          usuario={acao.usuario}
          executando={executando}
          erro={erroDialogo}
          onCancelar={() => setAcao(null)}
          onSalvar={(alteracoes) => void executarNoDialogo(() => editarUsuario(acao.usuario.id, alteracoes))}
        />
      )}

      {acao?.tipo === 'redefinir' && (
        <ConfirmacaoDialog
          titulo="Redefinir senha"
          rotuloConfirmar="Gerar nova senha"
          executando={executando}
          onCancelar={() => setAcao(null)}
          onConfirmar={() =>
            void executar(async () => {
              const senha = await redefinirSenhaUsuario(acao.usuario.id)
              setSenhaGerada({ titulo: 'Senha redefinida', senha })
            })
          }
        >
          <p>
            Será gerada uma nova senha temporária para <strong>{acao.usuario.nome ?? acao.usuario.email}</strong>. A senha
            antiga e a sessão aberta dessa conta deixam de valer, e a pessoa define uma senha própria no próximo acesso.
          </p>
        </ConfirmacaoDialog>
      )}

      {acao?.tipo === 'detalhe' && <DetalheUsuarioDialog usuarioId={acao.usuario.id} onFechar={() => setAcao(null)} />}

      {senhaGerada && (
        <SenhaTemporariaDialog
          titulo={senhaGerada.titulo}
          senha={senhaGerada.senha}
          onFechar={() => setSenhaGerada(null)}
        />
      )}
    </div>
  )
}

/** O Master confirma um cadastro que chegou sem grupo escolhendo o grupo dele (sem grupo padrão). */
function ConfirmarComGrupo({
  usuario,
  grupos,
  executando,
  onCancelar,
  onConfirmar,
}: {
  usuario: UsuarioListado
  grupos: ItemGrupo[]
  executando: boolean
  onCancelar: () => void
  onConfirmar: (grupoId: string) => void
}) {
  const [grupoId, setGrupoId] = useState('')

  return (
    <ConfirmacaoDialog
      titulo="Confirmar cadastro"
      rotuloConfirmar="Confirmar e gerar senha"
      executando={executando}
      confirmarDesabilitado={!grupoId}
      onCancelar={onCancelar}
      onConfirmar={() => onConfirmar(grupoId)}
    >
      <p>
        <strong>{usuario.nome ?? usuario.email}</strong> se cadastrou sem passar pelo link de um grupo. Escolha a qual
        grupo a conta pertence; o Admin desse grupo passa a enxergá-la.
      </p>
      <select
        value={grupoId}
        onChange={(e) => setGrupoId(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      >
        <option value="">Escolha o grupo</option>
        {grupos.map((g) => (
          <option key={g.id} value={g.id}>
            {g.nome}
          </option>
        ))}
      </select>
    </ConfirmacaoDialog>
  )
}
