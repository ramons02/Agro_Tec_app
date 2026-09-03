import type { EstacaoInmet, MedicaoTempoReal, Talhao } from '../types'
import { BadgeStatusPlantio, BadgeStatusPulverizacao } from './ui/Badge'
import { Card, CardBody, CardHeader } from './ui/Card'
import { GraficoUmidade } from './GraficoUmidade'
import { PainelRecomendacao } from './PainelRecomendacao'
import { gerarRecomendacao } from '../lib/recomendacao'

function distanciaAproxKm(a: [number, number], b: [number, number]) {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLon = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return R * 2 * Math.asin(Math.sqrt(h))
}

interface PainelTalhaoProps {
  talhao: Talhao
  estacao: EstacaoInmet | undefined
  medicao: MedicaoTempoReal | undefined
}

export function PainelTalhao({ talhao, estacao, medicao }: PainelTalhaoProps) {
  const distancia = estacao ? distanciaAproxKm(talhao.centro, estacao.posicao) : null
  const recomendacao = gerarRecomendacao(talhao, medicao)

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{talhao.nome}</p>
          <p className="text-xs text-slate-500">{talhao.areaHa} ha</p>
        </div>
        <BadgeStatusPlantio status={talhao.statusPlantio} />
      </CardHeader>

      <CardBody className="flex-1 space-y-5 overflow-auto">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            O que fazer agora
          </h3>
          <PainelRecomendacao recomendacao={recomendacao} />
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Solo
          </h3>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Textura</dt>
            <dd className="text-right font-medium text-slate-800">{talhao.tipoSolo}</dd>
            <dt className="text-slate-500">Umidade 0-7cm</dt>
            <dd className="text-right font-medium text-slate-800">
              {(talhao.umidadeSolo0_7cm * 100).toFixed(0)}%
            </dd>
            <dt className="text-slate-500">Capacidade de campo</dt>
            <dd className="text-right font-medium text-slate-800">
              {(talhao.capacidadeCampo * 100).toFixed(0)}%
            </dd>
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Umidade do solo — últimos 10 dias
          </h3>
          <GraficoUmidade
            historico={talhao.historicoUmidade}
            statusAtual={talhao.statusPlantio}
            variante="detalhada"
          />
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Estação mais próxima
          </h3>
          {estacao ? (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">
                {estacao.codigo} — {estacao.nome}
              </p>
              <p className="text-slate-500">
                {distancia !== null ? `${distancia.toFixed(1)} km do centroide` : '—'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma estação vinculada.</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Janela de pulverização agora
          </h3>
          {medicao ? (
            <div className="space-y-2">
              <BadgeStatusPulverizacao status={medicao.statusPulverizacao} />
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-slate-500">Vento</dt>
                <dd className="text-right font-medium text-slate-800">
                  {medicao.ventoVelocidadeKmh.toFixed(1)} km/h
                </dd>
                <dt className="text-slate-500">Rajada</dt>
                <dd className="text-right font-medium text-slate-800">
                  {medicao.ventoRajadaKmh.toFixed(1)} km/h
                </dd>
              </dl>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sem medição disponível.</p>
          )}
        </section>
      </CardBody>
    </Card>
  )
}
