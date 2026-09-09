import { useState } from 'react'
import { BadgeStatusPulverizacao } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { usePulverizacao } from '../lib/apiHooks'
import { useAppData } from '../store/AppDataContext'
import type { Talhao } from '../types'

const REGRAS = [
  { label: 'Favorável / Liberado', faixa: 'Vento 3-10 km/h, rajada ≤15 km/h, Delta T 2-10°C' },
  { label: 'Bloqueio: vento forte', faixa: 'Vento > 10 km/h ou rajada > 15 km/h' },
  { label: 'Bloqueio: inversão térmica', faixa: 'Vento < 3 km/h ou Delta T < 2°C' },
  { label: 'Bloqueio: evaporação excessiva', faixa: 'Delta T > 10°C' },
]

export function PulverizacaoPage() {
  const { talhoes, carregando, erro } = useAppData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Janela de Pulverização</h1>
        <p className="text-sm text-slate-500">
          Consulta em tempo real, sem cache expirado, combinando vento/rajada e Delta T
          por talhão.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {REGRAS.map((r) => (
          <div key={r.label} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-medium text-slate-800">{r.label}</p>
            <p className="text-xs text-slate-500">{r.faixa}</p>
          </div>
        ))}
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {carregando && talhoes.length === 0 && (
        <p className="text-sm text-slate-400">Carregando talhões…</p>
      )}
      {!carregando && talhoes.length === 0 && !erro && (
        <p className="text-sm text-slate-400">Nenhum talhão cadastrado ainda.</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {talhoes.map((talhao) => (
          <CardPulverizacaoTalhao key={talhao.id} talhao={talhao} />
        ))}
      </div>
    </div>
  )
}

function CardPulverizacaoTalhao({ talhao }: { talhao: Talhao }) {
  const [versao, setVersao] = useState(0)
  const { dados, carregando, erro } = usePulverizacao(talhao.id, versao)

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{talhao.nome}</p>
        {dados && <BadgeStatusPulverizacao status={dados.classificacao} />}
      </CardHeader>
      <CardBody className="space-y-3">
        {carregando && <p className="text-sm text-slate-400">Consultando…</p>}
        {!carregando && erro && <p className="text-sm text-red-600">{erro}</p>}
        {!carregando && !erro && !dados && (
          <p className="text-sm text-slate-400">
            Sem leitura de vento disponível ainda para este talhão.
          </p>
        )}
        {dados && (
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Vento</dt>
            <dd className="text-right font-medium text-slate-800">
              {dados.ventoKmh !== null ? `${dados.ventoKmh.toFixed(1)} km/h` : '—'}
            </dd>
            <dt className="text-slate-500">Rajada</dt>
            <dd className="text-right font-medium text-slate-800">
              {dados.rajadaKmh !== null ? `${dados.rajadaKmh.toFixed(1)} km/h` : '—'}
            </dd>
            <dt className="text-slate-500">Delta T</dt>
            <dd className="text-right font-medium text-slate-800">
              {dados.deltaTC !== null ? `${dados.deltaTC.toFixed(1)} °C` : '—'}
            </dd>
          </dl>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400">{dados ? `Fonte: ${dados.fonteDados}` : ''}</p>
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={carregando}
            onClick={() => setVersao((v) => v + 1)}
          >
            {carregando ? 'Atualizando…' : 'Atualizar agora'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
