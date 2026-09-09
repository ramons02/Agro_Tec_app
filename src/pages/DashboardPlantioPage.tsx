import { useMemo, useState } from 'react'
import { BadgeStatusPlantio } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { GraficoUmidade } from '../components/GraficoUmidade'
import { apiGetBlob, ApiError } from '../lib/apiClient'
import { salvarArquivo } from '../lib/exportarCsv'
import { useBalancoHidricoHistorico } from '../lib/apiHooks'
import { useAppData } from '../store/AppDataContext'
import type { Propriedade, StatusPlantio, Talhao } from '../types'

const FILTROS_STATUS: Array<{ valor: StatusPlantio | 'TODOS'; label: string }> = [
  { valor: 'TODOS', label: 'Todos' },
  { valor: 'VERDE', label: 'Verde' },
  { valor: 'AMARELO', label: 'Amarelo' },
  { valor: 'VERMELHO', label: 'Vermelho' },
]

export function DashboardPlantioPage() {
  const { propriedades, talhoes, carregando, erro } = useAppData()
  const [propriedadeId, setPropriedadeId] = useState<string>('TODAS')
  const [status, setStatus] = useState<StatusPlantio | 'TODOS'>('TODOS')
  const [exportando, setExportando] = useState(false)
  const [erroExportacao, setErroExportacao] = useState<string | null>(null)

  const talhoesFiltrados = useMemo(
    () =>
      talhoes.filter(
        (t) =>
          (propriedadeId === 'TODAS' || t.propriedadeId === propriedadeId) &&
          (status === 'TODOS' || t.statusPlantio === status),
      ),
    [talhoes, propriedadeId, status],
  )

  const contagem = {
    VERDE: talhoes.filter((t) => t.statusPlantio === 'VERDE').length,
    AMARELO: talhoes.filter((t) => t.statusPlantio === 'AMARELO').length,
    VERMELHO: talhoes.filter((t) => t.statusPlantio === 'VERMELHO').length,
  }

  async function handleExportarCsv() {
    setErroExportacao(null)
    setExportando(true)
    try {
      const parametros = new URLSearchParams()
      if (propriedadeId !== 'TODAS') parametros.set('propriedade_id', propriedadeId)
      if (status !== 'TODOS') parametros.set('status', status)
      const query = parametros.toString()

      // Vem do backend (feature 015), não montado no cliente — reflete
      // exatamente o filtro aplicado, sem o limite de paginação do
      // AppDataContext.
      const blob = await apiGetBlob(`/api/v1/dashboard/plantio/exportar.csv${query ? `?${query}` : ''}`)
      await salvarArquivo(blob, `plantio-agroclima-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (excecao) {
      setErroExportacao(excecao instanceof ApiError ? excecao.message : 'Falha ao exportar o CSV.')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Status de Plantio por Talhão</h1>
          <p className="text-sm text-slate-500">
            Balanço Hídrico do Solo (HU-10) consolidado em painel de decisão (HU-11).
          </p>
        </div>
        <Button
          variant="secondary"
          className="shrink-0"
          disabled={talhoesFiltrados.length === 0 || exportando}
          onClick={() => void handleExportarCsv()}
        >
          {exportando ? 'Exportando…' : 'Exportar CSV'}
        </Button>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {erroExportacao && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erroExportacao}</p>
      )}
      {carregando && talhoes.length === 0 && (
        <p className="text-sm text-slate-400">Carregando talhões…</p>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Ideal para plantio" valor={contagem.VERDE} cor="text-emerald-600" />
        <StatCard label="Atenção" valor={contagem.AMARELO} cor="text-amber-600" />
        <StatCard label="Risco" valor={contagem.VERMELHO} cor="text-red-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={propriedadeId}
          onChange={(e) => setPropriedadeId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
        >
          <option value="TODAS">Todas as propriedades</option>
          {propriedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>

        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {FILTROS_STATUS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setStatus(f.valor)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === f.valor
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {talhoesFiltrados.map((talhao) => (
          <CardTalhaoPlantio
            key={talhao.id}
            talhao={talhao}
            propriedade={propriedades.find((p) => p.id === talhao.propriedadeId)}
          />
        ))}

        {talhoesFiltrados.length === 0 && !carregando && (
          <p className="col-span-3 py-8 text-center text-sm text-slate-400">
            Nenhum talhão encontrado para os filtros selecionados.
          </p>
        )}
      </div>
    </div>
  )
}

function CardTalhaoPlantio({ talhao, propriedade }: { talhao: Talhao; propriedade: Propriedade | undefined }) {
  const { dados: historicoReal } = useBalancoHidricoHistorico(talhao.id)

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{talhao.nome}</p>
            <p className="text-xs text-slate-500">{propriedade?.nome}</p>
          </div>
          {talhao.statusPlantio ? (
            <BadgeStatusPlantio status={talhao.statusPlantio} />
          ) : (
            <span className="text-xs text-slate-400">Sem cálculo</span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-500">Área</dt>
          <dd className="text-right font-medium text-slate-800">{talhao.areaHa.toFixed(1)} ha</dd>
          <dt className="text-slate-500">Solo</dt>
          <dd className="text-right font-medium text-slate-800">{talhao.tipoSolo ?? '—'}</dd>
          <dt className="text-slate-500">% da CAD</dt>
          <dd className="text-right font-medium text-slate-800">
            {talhao.percentualCad !== null ? `${talhao.percentualCad.toFixed(0)}%` : '—'}
          </dd>
        </dl>

        <div className="border-t border-slate-100 pt-2">
          <p className="mb-1 text-xs text-slate-400">% da CAD — últimos dias (real)</p>
          {historicoReal && historicoReal.length > 0 ? (
            <GraficoUmidade
              historico={historicoReal}
              statusAtual={talhao.statusPlantio ?? 'AMARELO'}
              variante="compacta"
              rotuloTooltip="da CAD"
            />
          ) : (
            <p className="text-xs text-slate-400">Sem histórico calculado ainda.</p>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

function StatCard({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${cor}`}>{valor}</p>
    </div>
  )
}
