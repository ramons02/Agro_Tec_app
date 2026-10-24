import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { TAMANHO_PAGINA_USUARIOS, useResumoUsuarios, useUsuarios } from '../lib/apiHooks'
import { useAuth } from '../store/AuthContext'
import type { Papel } from '../types'

const PAPEL_ROTULO: Record<Papel, string> = {
  PRODUTOR_RURAL: 'Produtor rural',
  AGRONOMO: 'Agrônomo',
  GESTOR_TECNOLOGIA: 'Gestor',
}

const PAPEL_ESTILO: Record<Papel, string> = {
  PRODUTOR_RURAL: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  AGRONOMO: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  GESTOR_TECNOLOGIA: 'bg-violet-50 text-violet-700 ring-violet-600/20',
}

const FILTROS: Array<{ valor: Papel | null; rotulo: string }> = [
  { valor: null, rotulo: 'Todos' },
  { valor: 'PRODUTOR_RURAL', rotulo: 'Produtores' },
  { valor: 'AGRONOMO', rotulo: 'Agrônomos' },
  { valor: 'GESTOR_TECNOLOGIA', rotulo: 'Gestores' },
]

function formatarData(iso: string | null): string {
  if (!iso) return '—'
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
  if (papel !== 'GESTOR_TECNOLOGIA') return <Navigate to="/mapa" replace />
  return <PainelUsuarios />
}

function PainelUsuarios() {
  const [filtroPapel, setFiltroPapel] = useState<Papel | null>(null)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [pagina, setPagina] = useState(1)

  // Espera o gestor parar de digitar antes de consultar a API.
  useEffect(() => {
    const espera = setTimeout(() => {
      setBuscaAplicada(busca)
      setPagina(1)
    }, 350)
    return () => clearTimeout(espera)
  }, [busca])

  const { dados: resumo, erro: erroResumo } = useResumoUsuarios()
  const { dados: lista, carregando, erro } = useUsuarios(filtroPapel, buscaAplicada, pagina)

  const total = lista?.total ?? 0
  const primeiro = total === 0 ? 0 : (pagina - 1) * TAMANHO_PAGINA_USUARIOS + 1
  const ultimo = Math.min(pagina * TAMANHO_PAGINA_USUARIOS, total)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Usuários</h1>
        <p className="text-sm text-slate-500">
          Contas criadas na plataforma: quem se cadastrou, quando, e quanto já usa o sistema.
        </p>
      </div>

      {erroResumo && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erroResumo}</p>}
      {resumo && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <CartaoResumo titulo="Total de contas" valor={resumo.total} />
          <CartaoResumo titulo="Produtores" valor={resumo.porPapel.PRODUTOR_RURAL ?? 0} />
          <CartaoResumo titulo="Agrônomos" valor={resumo.porPapel.AGRONOMO ?? 0} />
          <CartaoResumo titulo="Gestores" valor={resumo.porPapel.GESTOR_TECNOLOGIA ?? 0} />
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
              {FILTROS.map((f) => (
                <button
                  key={f.rotulo}
                  onClick={() => {
                    setFiltroPapel(f.valor)
                    setPagina(1)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filtroPapel === f.valor
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.rotulo}
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Papel</th>
                <th className="px-5 py-3 text-right font-medium">Propriedades</th>
                <th className="px-5 py-3 font-medium">Telegram</th>
                <th className="px-5 py-3 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista?.itens.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{u.nome ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PAPEL_ESTILO[u.papel]}`}
                    >
                      {PAPEL_ROTULO[u.papel]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-700">{u.propriedades}</td>
                  <td className="px-5 py-3 text-slate-600">{u.telegramVinculado ? 'Vinculado' : '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatarData(u.criadoEm)}</td>
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
    </div>
  )
}
