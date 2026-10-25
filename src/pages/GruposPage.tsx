import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ConfirmacaoDialog } from '../components/usuarios/ConfirmacaoDialog'
import { NovoLinkDialog } from '../components/usuarios/NovoLinkDialog'
import { SenhaTemporariaDialog } from '../components/usuarios/SenhaTemporariaDialog'
import { Button } from '../components/ui/Button'
import { BotaoIcone } from '../components/ui/BotaoIcone'
import { Card } from '../components/ui/Card'
import { CartaoDeLinha } from '../components/ui/CartaoDeLinha'
import {
  convidarMaster,
  criarGrupo,
  excluirGrupo,
  listarGrupos,
  reatribuirGrupo,
  renomearGrupo,
  type ItemGrupo,
} from '../lib/acoesGrupos'
import { ApiError } from '../lib/apiClient'
import { ehMaster } from '../lib/papeis'
import { useAuth } from '../store/AuthContext'
import type { SenhaTemporaria } from '../types'

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

function mensagem(excecao: unknown): string {
  return excecao instanceof ApiError ? excecao.message : 'Não consegui concluir a ação. Tente novamente.'
}

/** Grupos e Admins: só o Master (a API também recusa os demais com 403). */
export function GruposPage() {
  const { papel } = useAuth()
  if (!ehMaster(papel)) return <Navigate to="/mapa" replace />
  return <PainelGrupos />
}

function PainelGrupos() {
  const [grupos, setGrupos] = useState<ItemGrupo[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [novo, setNovo] = useState(false)
  const [reatribuindo, setReatribuindo] = useState<ItemGrupo | null>(null)
  const [convidando, setConvidando] = useState(false)
  const [gerandoLink, setGerandoLink] = useState<ItemGrupo | null>(null)
  const [editando, setEditando] = useState<ItemGrupo | null>(null)
  const [excluindo, setExcluindo] = useState<ItemGrupo | null>(null)
  const [executando, setExecutando] = useState(false)
  const [erroDialogo, setErroDialogo] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [senhaGerada, setSenhaGerada] = useState<{ titulo: string; senha: SenhaTemporaria } | null>(null)
  const [linkConvite, setLinkConvite] = useState<{ link: string; expiraEm: string } | null>(null)

  useEffect(() => {
    let cancelado = false
    listarGrupos()
      .then((g) => {
        if (!cancelado) setGrupos(g)
      })
      .catch((excecao) => {
        if (!cancelado) setErro(mensagem(excecao))
      })
    return () => {
      cancelado = true
    }
  }, [versao])

  async function executar(operacao: () => Promise<void>) {
    setExecutando(true)
    setErroDialogo(null)
    try {
      await operacao()
      setVersao((v) => v + 1)
    } catch (excecao) {
      setErroDialogo(mensagem(excecao))
    } finally {
      setExecutando(false)
    }
  }

  /** Os mesmos quatro botões na tabela (a partir de 768 px) e no cartão (celular). */
  function acoesDoGrupo(g: ItemGrupo) {
    const semDestino = (grupos?.length ?? 0) < 2
    return (
      <>
        <BotaoIcone rotulo="Link de cadastro" onClick={() => setGerandoLink(g)}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </BotaoIcone>
        <BotaoIcone
          rotulo="Passar para outro Admin"
          disabled={semDestino}
          title={semDestino ? 'É preciso ter outro grupo de destino.' : 'Passar para outro Admin'}
          onClick={() => { setErroDialogo(null); setReatribuindo(g) }}
        >
          <path d="m17 3 4 4-4 4" />
          <path d="M3 7h18" />
          <path d="m7 21-4-4 4-4" />
          <path d="M21 17H3" />
        </BotaoIcone>
        <BotaoIcone rotulo="Editar grupo" onClick={() => { setErroDialogo(null); setEditando(g) }}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </BotaoIcone>
        <BotaoIcone
          rotulo="Excluir grupo"
          perigo
          onClick={() => { setErroDialogo(null); setExcluindo(g) }}
        >
          <path d="M3 6h18" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M10 11v6M14 11v6" />
        </BotaoIcone>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Grupos</h1>
          <p className="text-sm text-slate-500">
            Cada Admin gere o grupo dele. Aqui você cria Admins com o grupo deles, passa um grupo para outro Admin e
            convida outro Master.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setErroDialogo(null); setConvidando(true) }}>
            Convidar Master
          </Button>
          <Button onClick={() => { setErroDialogo(null); setNovo(true) }}>Novo grupo e Admin</Button>
        </div>
      </div>

      {aviso && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{aviso}</p>}
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <Card>
        <ul className="space-y-3 p-4 md:hidden">
          {grupos?.map((g) => (
            <CartaoDeLinha
              key={g.id}
              titulo={g.nome}
              subtitulo={g.admin ? `${g.admin.nome ?? '-'} · ${g.admin.email}` : undefined}
              campos={[
                { rotulo: 'Contas', valor: g.usuarios },
                { rotulo: 'Criado em', valor: formatarData(g.criadoEm) },
              ]}
              acoes={<div className="flex w-full justify-end">{acoesDoGrupo(g)}</div>}
            />
          ))}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Grupo</th>
                <th className="px-5 py-3 font-medium">Admin</th>
                <th className="px-5 py-3 text-right font-medium">Contas</th>
                <th className="px-5 py-3 font-medium">Criado em</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grupos?.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{g.nome}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {g.admin ? `${g.admin.nome ?? '-'} · ${g.admin.email}` : '-'}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-700">{g.usuarios}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatarData(g.criadoEm)}</td>
                  <td className="px-5 py-3 text-right">
                    {acoesDoGrupo(g)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!grupos && !erro && <p className="px-5 py-6 text-sm text-slate-400">Carregando grupos…</p>}
      </Card>

      {novo && (
        <NovoGrupoDialog
          executando={executando}
          erro={erroDialogo}
          onCancelar={() => setNovo(false)}
          onCriar={(nome, adminNome, adminEmail) =>
            void executar(async () => {
              const senha = await criarGrupo(nome, adminNome, adminEmail)
              setNovo(false)
              setSenhaGerada({ titulo: 'Grupo e Admin criados', senha })
            })
          }
        />
      )}

      {reatribuindo && grupos && (
        <ReatribuirDialog
          origem={reatribuindo}
          destinos={grupos.filter((g) => g.id !== reatribuindo.id)}
          executando={executando}
          erro={erroDialogo}
          onCancelar={() => setReatribuindo(null)}
          onReatribuir={(destinoId) =>
            void executar(async () => {
              const r = await reatribuirGrupo(reatribuindo.id, destinoId)
              setReatribuindo(null)
              setAviso(`${r.produtores} produtor(es) e ${r.agronomos} agrônomo(s) passaram para o outro grupo.`)
            })
          }
        />
      )}

      {editando && (
        <EditarGrupoDialog
          grupo={editando}
          executando={executando}
          erro={erroDialogo}
          onCancelar={() => setEditando(null)}
          onSalvar={(nome) =>
            void executar(async () => {
              await renomearGrupo(editando.id, nome)
              setEditando(null)
              setAviso(`Grupo renomeado para ${nome}.`)
            })
          }
        />
      )}

      {excluindo && (
        <ConfirmacaoDialog
          titulo="Excluir grupo"
          rotuloConfirmar="Excluir"
          perigosa
          executando={executando}
          onCancelar={() => setExcluindo(null)}
          onConfirmar={() =>
            void executar(async () => {
              await excluirGrupo(excluindo.id)
              setExcluindo(null)
              setAviso(`Grupo ${excluindo.nome} excluído.`)
            })
          }
        >
          <p>
            Excluir o grupo <strong>{excluindo.nome}</strong>? Só é possível se ele não tiver contas nem propriedades:
            passe-as para outro Admin antes. O Admin do grupo fica sem grupo e é suspenso.
          </p>
          {erroDialogo && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{erroDialogo}</p>}
        </ConfirmacaoDialog>
      )}

      {convidando && (
        <ConviteDialog
          executando={executando}
          erro={erroDialogo}
          link={linkConvite}
          onCancelar={() => { setConvidando(false); setLinkConvite(null) }}
          onConvidar={(email) =>
            void executar(async () => {
              setLinkConvite(await convidarMaster(email))
            })
          }
        />
      )}

      {gerandoLink && (
        <NovoLinkDialog grupoId={gerandoLink.id} grupoNome={gerandoLink.nome} onFechar={() => setGerandoLink(null)} />
      )}

      {senhaGerada && (
        <SenhaTemporariaDialog titulo={senhaGerada.titulo} senha={senhaGerada.senha} onFechar={() => setSenhaGerada(null)} />
      )}
    </div>
  )
}

const CAMPO =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

function NovoGrupoDialog({
  executando,
  erro,
  onCancelar,
  onCriar,
}: {
  executando: boolean
  erro: string | null
  onCancelar: () => void
  onCriar: (nome: string, adminNome: string, adminEmail: string) => void
}) {
  const [nome, setNome] = useState('')
  const [adminNome, setAdminNome] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onCriar(nome.trim(), adminNome.trim(), adminEmail.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Novo grupo e Admin</h2>
          <p className="mt-1 text-sm text-slate-500">
            O Admin nasce com uma senha temporária, mostrada uma única vez para você repassar. Ele gere só o grupo dele.
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome do grupo (cliente)</label>
          <input required value={nome} onChange={(e) => setNome(e.target.value)} className={CAMPO} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome do Admin</label>
          <input required value={adminNome} onChange={(e) => setAdminNome(e.target.value)} className={CAMPO} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail do Admin</label>
          <input type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className={CAMPO} />
        </div>
        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancelar} disabled={executando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={executando}>
            {executando ? 'Criando…' : 'Criar'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function ReatribuirDialog({
  origem,
  destinos,
  executando,
  erro,
  onCancelar,
  onReatribuir,
}: {
  origem: ItemGrupo
  destinos: ItemGrupo[]
  executando: boolean
  erro: string | null
  onCancelar: () => void
  onReatribuir: (destinoId: string) => void
}) {
  const [destino, setDestino] = useState('')

  return (
    <ConfirmacaoDialog
      titulo="Passar o grupo para outro Admin"
      rotuloConfirmar="Passar o grupo"
      executando={executando}
      confirmarDesabilitado={!destino}
      onCancelar={onCancelar}
      onConfirmar={() => onReatribuir(destino)}
    >
      <p>
        Todos os produtores e agrônomos de <strong>{origem.nome}</strong> passam para o grupo escolhido, com as
        propriedades e talhões. As sessões abertas deles caem e eles entram de novo. O Admin de {origem.nome} fica sozinho
        no grupo dele.
      </p>
      <select value={destino} onChange={(e) => setDestino(e.target.value)} className={CAMPO}>
        <option value="">Escolha o grupo de destino</option>
        {destinos.map((g) => (
          <option key={g.id} value={g.id}>
            {g.nome}
          </option>
        ))}
      </select>
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{erro}</p>}
    </ConfirmacaoDialog>
  )
}

function EditarGrupoDialog({
  grupo,
  executando,
  erro,
  onCancelar,
  onSalvar,
}: {
  grupo: ItemGrupo
  executando: boolean
  erro: string | null
  onCancelar: () => void
  onSalvar: (nome: string) => void
}) {
  const [nome, setNome] = useState(grupo.nome)
  const alterado = nome.trim() !== '' && nome.trim() !== grupo.nome

  return (
    <ConfirmacaoDialog
      titulo="Editar grupo"
      rotuloConfirmar="Salvar"
      executando={executando}
      confirmarDesabilitado={!alterado}
      onCancelar={onCancelar}
      onConfirmar={() => onSalvar(nome.trim())}
    >
      <label className="block text-sm font-medium text-slate-700">
        Nome do grupo
        <input
          value={nome}
          maxLength={120}
          onChange={(e) => setNome(e.target.value)}
          className={`${CAMPO} mt-1.5`}
        />
      </label>
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{erro}</p>}
    </ConfirmacaoDialog>
  )
}

function ConviteDialog({
  executando,
  erro,
  link,
  onCancelar,
  onConvidar,
}: {
  executando: boolean
  erro: string | null
  link: { link: string; expiraEm: string } | null
  onCancelar: () => void
  onConvidar: (email: string) => void
}) {
  const [email, setEmail] = useState('')
  const [copiado, setCopiado] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onConvidar(email.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Convidar outro Master</h2>
          <p className="mt-1 text-sm text-slate-500">
            O convite vale uma vez, só para esse e-mail, e dá acesso a toda a plataforma. Envie o link só para a pessoa certa.
          </p>
        </div>
        {!link ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail do convidado</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={CAMPO} />
            </div>
            {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onCancelar} disabled={executando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={executando}>
                {executando ? 'Gerando…' : 'Gerar convite'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Link do convite</label>
              <div className="flex gap-2">
                <input readOnly value={link.link} onFocus={(e) => e.currentTarget.select()} className={`${CAMPO} bg-slate-50 font-mono text-xs`} />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link.link)
                      setCopiado(true)
                    } catch {
                      setCopiado(false)
                    }
                  }}
                >
                  {copiado ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Vale até {formatarData(link.expiraEm)}.</p>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={onCancelar}>
                Fechar
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
