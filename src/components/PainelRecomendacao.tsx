import type { Prioridade, RecomendacaoResultado } from '../types'

const ESTILO_PRIORIDADE: Record<Prioridade, string> = {
  ALTA: 'border-red-200 bg-red-50',
  MEDIA: 'border-amber-200 bg-amber-50',
  BAIXA: 'border-emerald-200 bg-emerald-50',
}

const COR_TITULO: Record<Prioridade, string> = {
  ALTA: 'text-red-700',
  MEDIA: 'text-amber-700',
  BAIXA: 'text-emerald-700',
}

const TITULO_PRIORIDADE: Record<Prioridade, string> = {
  ALTA: 'Ação necessária',
  MEDIA: 'Atenção recomendada',
  BAIXA: 'Tudo certo por aqui',
}

export function PainelRecomendacao({ recomendacao }: { recomendacao: RecomendacaoResultado }) {
  return (
    <div className={`rounded-lg border p-3 ${ESTILO_PRIORIDADE[recomendacao.prioridade]}`}>
      <p className={`flex items-center gap-1.5 text-sm font-semibold ${COR_TITULO[recomendacao.prioridade]}`}>
        <span className="text-[8px]">●</span>
        {TITULO_PRIORIDADE[recomendacao.prioridade]}
      </p>
      <p className="mt-1.5 text-sm text-slate-700">{recomendacao.texto}</p>
      <p className="mt-2 text-[11px] text-slate-400">{recomendacao.aviso}</p>
    </div>
  )
}
