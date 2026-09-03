import { useState } from 'react'
import { BadgeStatusPulverizacao } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { estacoesInmet } from '../mocks/data'
import { useAppData } from '../store/AppDataContext'

const REGRAS = [
  { label: 'Favorável / Liberado', faixa: 'Vento entre 3 km/h e 10 km/h' },
  { label: 'Bloqueio: vento forte', faixa: 'Vento > 10 km/h ou rajada > 15 km/h' },
  { label: 'Bloqueio: inversão térmica', faixa: 'Vento < 3 km/h' },
]

export function PulverizacaoPage() {
  const { medicoes, atualizarMedicao } = useAppData()
  const [atualizandoCodigo, setAtualizandoCodigo] = useState<string | null>(null)

  function atualizarAgora(codigo: string) {
    setAtualizandoCodigo(codigo)
    // Simula a consulta assíncrona sem cache (HU-08): busca imediata quando a medição expira.
    setTimeout(() => {
      atualizarMedicao(codigo, { dataHoraUtc: new Date().toISOString() })
      setAtualizandoCodigo(null)
    }, 700)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Janela de Pulverização</h1>
        <p className="text-sm text-slate-500">
          Consulta em tempo real, sem cache expirado (HU-08), com o motor de regras de
          vento e rajada aplicado por estação (HU-09).
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {REGRAS.map((r) => (
          <div key={r.label} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-medium text-slate-800">{r.label}</p>
            <p className="text-xs text-slate-500">{r.faixa}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {estacoesInmet.map((estacao) => {
          const medicao = medicoes[estacao.codigo]
          const atualizando = atualizandoCodigo === estacao.codigo

          return (
            <Card key={estacao.codigo}>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {estacao.codigo} — {estacao.nome}
                  </p>
                  <p className="text-xs text-slate-500">{estacao.municipio}</p>
                </div>
                <BadgeStatusPulverizacao status={medicao.statusPulverizacao} />
              </CardHeader>
              <CardBody className="space-y-3">
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-slate-500">Vento</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {medicao.ventoVelocidadeKmh.toFixed(1)} km/h
                  </dd>
                  <dt className="text-slate-500">Rajada</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {medicao.ventoRajadaKmh.toFixed(1)} km/h
                  </dd>
                  <dt className="text-slate-500">Temperatura</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {medicao.temperaturaC.toFixed(1)} °C
                  </dd>
                  <dt className="text-slate-500">Chuva acumulada</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {medicao.precipitacaoMm.toFixed(1)} mm
                  </dd>
                </dl>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-400">
                    Atualizado às{' '}
                    {new Date(medicao.dataHoraUtc).toLocaleTimeString('pt-BR')}
                  </p>
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    disabled={atualizando}
                    onClick={() => atualizarAgora(estacao.codigo)}
                  >
                    {atualizando ? 'Atualizando…' : 'Atualizar agora'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
