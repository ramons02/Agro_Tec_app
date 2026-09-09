import { gerarEnriquecimentoSimulado } from '../lib/enriquecimentoSimulado'
import { useBalancoHidrico, useClimaAtual, usePulverizacao, useRecomendacao } from '../lib/apiHooks'
import type { EstacaoProxima, Talhao } from '../types'
import { BadgeStatusPlantio, BadgeStatusPulverizacao } from './ui/Badge'
import { Card, CardBody, CardHeader } from './ui/Card'
import { GraficoUmidade } from './GraficoUmidade'
import { PainelRecomendacao } from './PainelRecomendacao'

interface PainelTalhaoProps {
  talhao: Talhao
  estacaoMaisProxima: EstacaoProxima | null
}

export function PainelTalhao({ talhao, estacaoMaisProxima }: PainelTalhaoProps) {
  const { dados: clima } = useClimaAtual(talhao.id)
  const { dados: pulverizacao } = usePulverizacao(talhao.id)
  const { dados: recomendacao } = useRecomendacao(talhao.id)
  const { dados: balancoHidrico } = useBalancoHidrico(talhao.id)
  const { umidadeSolo0_7cm, capacidadeCampo, historicoUmidade } = gerarEnriquecimentoSimulado(
    talhao.id,
    talhao.statusPlantio,
  )

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{talhao.nome}</p>
          <p className="text-xs text-slate-500">{talhao.areaHa.toFixed(1)} ha</p>
        </div>
        {talhao.statusPlantio && <BadgeStatusPlantio status={talhao.statusPlantio} />}
      </CardHeader>

      <CardBody className="flex-1 space-y-5 overflow-auto">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            O que fazer agora
          </h3>
          {recomendacao ? (
            <PainelRecomendacao recomendacao={recomendacao} />
          ) : (
            <p className="text-sm text-slate-400">Carregando recomendação…</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Solo
          </h3>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Textura</dt>
            <dd className="text-right font-medium text-slate-800">{talhao.tipoSolo ?? '—'}</dd>
            <dt className="text-slate-500">Umidade 0-7cm (simulado)</dt>
            <dd className="text-right font-medium text-slate-800">
              {(umidadeSolo0_7cm * 100).toFixed(0)}%
            </dd>
            <dt className="text-slate-500">Capacidade de campo (simulado)</dt>
            <dd className="text-right font-medium text-slate-800">
              {(capacidadeCampo * 100).toFixed(0)}%
            </dd>
            <dt className="text-slate-500">% da CAD (real)</dt>
            <dd className="text-right font-medium text-slate-800">
              {talhao.percentualCad !== null ? `${talhao.percentualCad.toFixed(0)}%` : '—'}
            </dd>
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Balanço hídrico do dia (real)
          </h3>
          {balancoHidrico ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">Data do cálculo</dt>
              <dd className="text-right font-medium text-slate-800">{balancoHidrico.data}</dd>
              <dt className="text-slate-500">Chuva medida</dt>
              <dd className="text-right font-medium text-slate-800">
                {balancoHidrico.precipitacaoMm.toFixed(1)} mm
              </dd>
              <dt className="text-slate-500">Evapotranspiração</dt>
              <dd className="text-right font-medium text-slate-800">
                {balancoHidrico.evapotranspiracaoMm.toFixed(1)} mm
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-slate-400">
              Ainda sem balanço hídrico calculado pra este talhão.
            </p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Umidade do solo — últimos 10 dias (simulado)
          </h3>
          <GraficoUmidade
            historico={historicoUmidade}
            statusAtual={talhao.statusPlantio ?? 'AMARELO'}
            variante="detalhada"
          />
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Estação mais próxima
          </h3>
          {estacaoMaisProxima ? (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">
                {estacaoMaisProxima.estacaoCodigo} — {estacaoMaisProxima.municipio}
              </p>
              <p className="text-slate-500">{estacaoMaisProxima.distanciaKm.toFixed(1)} km do centroide</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma estação vinculada.</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Janela de pulverização agora
          </h3>
          {pulverizacao ? (
            <div className="space-y-2">
              <BadgeStatusPulverizacao status={pulverizacao.classificacao} />
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-slate-500">Vento</dt>
                <dd className="text-right font-medium text-slate-800">
                  {pulverizacao.ventoKmh !== null ? `${pulverizacao.ventoKmh.toFixed(1)} km/h` : '—'}
                </dd>
                <dt className="text-slate-500">Rajada</dt>
                <dd className="text-right font-medium text-slate-800">
                  {pulverizacao.rajadaKmh !== null ? `${pulverizacao.rajadaKmh.toFixed(1)} km/h` : '—'}
                </dd>
                <dt className="text-slate-500">Delta T</dt>
                <dd className="text-right font-medium text-slate-800">
                  {pulverizacao.deltaTC !== null ? `${pulverizacao.deltaTC.toFixed(1)} °C` : '—'}
                </dd>
              </dl>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {clima ? 'Sem dado suficiente para classificar.' : 'Sem medição disponível.'}
            </p>
          )}
        </section>
      </CardBody>
    </Card>
  )
}
