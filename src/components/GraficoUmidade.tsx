import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotItemDotProps,
  type TooltipContentProps,
} from 'recharts'
import type { PontoHistoricoUmidade, StatusPlantio } from '../types'
import { STATUS_PLANTIO_COR_MAPA } from './ui/Badge'

interface GraficoUmidadeProps {
  historico: PontoHistoricoUmidade[]
  statusAtual: StatusPlantio
  variante?: 'compacta' | 'detalhada'
  /** Texto após o percentual no tooltip — o gráfico é genérico (qualquer série 0-1 no
   * tempo), usado tanto pra umidade simulada quanto pro % da CAD real. */
  rotuloTooltip?: string
}

function formatarDataCurta(iso: string) {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function TooltipUmidade({
  active,
  payload,
  rotulo,
}: TooltipContentProps & { rotulo: string }) {
  if (!active || !payload?.length) return null
  const ponto = payload[0].payload as PontoHistoricoUmidade

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-500">{formatarDataCurta(ponto.data)}</p>
      <p className="font-semibold text-slate-800">
        {(ponto.umidade * 100).toFixed(0)}% {rotulo}
      </p>
    </div>
  )
}

export function GraficoUmidade({
  historico,
  statusAtual,
  variante = 'detalhada',
  rotuloTooltip = 'de umidade',
}: GraficoUmidadeProps) {
  const corPontoAtual = STATUS_PLANTIO_COR_MAPA[statusAtual]
  const compacta = variante === 'compacta'
  const raioPonto = compacta ? 3 : 5

  function pontoAtual(props: DotItemDotProps) {
    const ehUltimo = props.index === historico.length - 1
    if (!ehUltimo || props.cx === undefined || props.cy === undefined) {
      return <g key={props.index} />
    }
    return (
      <circle
        key={props.index}
        cx={props.cx}
        cy={props.cy}
        r={raioPonto}
        fill={corPontoAtual}
        stroke="#ffffff"
        strokeWidth={2}
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={compacta ? 48 : 220}>
      <AreaChart
        data={historico}
        margin={
          compacta
            ? { top: 4, right: 2, bottom: 0, left: 2 }
            : { top: 8, right: 12, bottom: 0, left: 0 }
        }
      >
        <defs>
          <linearGradient id="gradienteUmidade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#475569" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#475569" stopOpacity={0} />
          </linearGradient>
        </defs>

        {!compacta && (
          <>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="data"
              tickFormatter={formatarDataCurta}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(valor: number) => `${Math.round(valor * 100)}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              width={36}
            />
          </>
        )}

        <Tooltip
          content={(props) => <TooltipUmidade {...props} rotulo={rotuloTooltip} />}
          cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
        />

        <Area
          type="monotone"
          dataKey="umidade"
          stroke="#475569"
          strokeWidth={2}
          fill="url(#gradienteUmidade)"
          dot={pontoAtual}
          activeDot={{ r: raioPonto, fill: corPontoAtual, stroke: '#ffffff', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
