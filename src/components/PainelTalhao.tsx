import {
  useBalancoHidrico,
  useBalancoHidricoHistorico,
  useClimaAtual,
  usePulverizacao,
  useRecomendacao,
  useSoloTalhao,
} from '../lib/apiHooks'
import type { Talhao } from '../types'
import { BadgeStatusPlantio, BadgeStatusPulverizacao } from './ui/Badge'
import { Card, CardBody, CardHeader } from './ui/Card'
import { GraficoUmidade } from './GraficoUmidade'
import { PainelRecomendacao } from './PainelRecomendacao'

interface PainelTalhaoProps {
  talhao: Talhao
  /** Nome do grupo do talhão; só o Master recebe, porque só ele enxerga mais de um grupo. */
  grupo?: string | null
}

export function PainelTalhao({ talhao, grupo }: PainelTalhaoProps) {
  const { dados: clima } = useClimaAtual(talhao.id)
  const { dados: pulverizacao } = usePulverizacao(talhao.id)
  const { dados: recomendacao } = useRecomendacao(talhao.id)
  const { dados: balancoHidrico } = useBalancoHidrico(talhao.id)
  const { dados: historicoReal } = useBalancoHidricoHistorico(talhao.id)
  const { dados: solo, carregando: carregandoSolo } = useSoloTalhao(talhao.id)
  const semDado = carregandoSolo ? 'Carregando…' : '-'
  const textura = solo?.tipoSolo ?? talhao.tipoSolo
  const rotuloSemTextura = solo?.soloPendente ? 'Buscando dados do solo…' : semDado

  return (
    <Card className="flex flex-col overflow-hidden lg:h-full">
      <CardHeader className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{talhao.nome}</p>
          <p className="text-xs text-slate-500">{talhao.areaHa.toFixed(1)} ha</p>
          {grupo !== undefined && (
            <p className="text-xs text-slate-500">Grupo: {grupo ?? 'sem grupo'}</p>
          )}
        </div>
        {talhao.statusPlantio && <BadgeStatusPlantio status={talhao.statusPlantio} />}
      </CardHeader>

      <CardBody className="flex-1 space-y-5 lg:overflow-auto">
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
            <dd className="text-right font-medium text-slate-800">{textura ?? rotuloSemTextura}</dd>
            <dt className="text-slate-500">Umidade 0-7cm (modelo Open-Meteo)</dt>
            <dd className="text-right font-medium text-slate-800">
              {solo?.umidade0a7cmPct != null ? `${solo.umidade0a7cmPct.toFixed(0)}%` : semDado}
            </dd>
            <dt className="text-slate-500">Capacidade de campo (calculada da textura)</dt>
            <dd className="text-right font-medium text-slate-800">
              {solo?.capacidadeCampoPct != null ? `${solo.capacidadeCampoPct.toFixed(0)}%` : rotuloSemTextura}
            </dd>
            <dt className="text-slate-500">% da CAD (real)</dt>
            <dd className="text-right font-medium text-slate-800">
              {talhao.percentualCad !== null ? `${talhao.percentualCad.toFixed(0)}%` : '-'}
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
            % da CAD, últimos dias (real)
          </h3>
          {historicoReal && historicoReal.length > 0 ? (
            <GraficoUmidade
              historico={historicoReal}
              statusAtual={talhao.statusPlantio ?? 'AMARELO'}
              variante="detalhada"
              rotuloTooltip="da CAD"
            />
          ) : (
            <p className="text-sm text-slate-400">
              Ainda não há dias suficientes de balanço hídrico calculado.
            </p>
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
                  {pulverizacao.ventoKmh !== null ? `${pulverizacao.ventoKmh.toFixed(1)} km/h` : '-'}
                </dd>
                <dt className="text-slate-500">Rajada</dt>
                <dd className="text-right font-medium text-slate-800">
                  {pulverizacao.rajadaKmh !== null ? `${pulverizacao.rajadaKmh.toFixed(1)} km/h` : '-'}
                </dd>
                <dt className="text-slate-500">Delta T</dt>
                <dd className="text-right font-medium text-slate-800">
                  {pulverizacao.deltaTC !== null ? `${pulverizacao.deltaTC.toFixed(1)} °C` : '-'}
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
