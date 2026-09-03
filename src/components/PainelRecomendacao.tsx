import type { Recomendacao } from '../lib/recomendacao'

const ESTILO_PRIORIDADE: Record<Recomendacao['prioridade'], string> = {
  ALTA: 'border-red-200 bg-red-50',
  MEDIA: 'border-amber-200 bg-amber-50',
  BAIXA: 'border-emerald-200 bg-emerald-50',
}

const COR_TITULO: Record<Recomendacao['prioridade'], string> = {
  ALTA: 'text-red-700',
  MEDIA: 'text-amber-700',
  BAIXA: 'text-emerald-700',
}

const ICONE_PRIORIDADE: Record<Recomendacao['prioridade'], string> = {
  ALTA: '●',
  MEDIA: '●',
  BAIXA: '●',
}

export function PainelRecomendacao({ recomendacao }: { recomendacao: Recomendacao }) {
  return (
    <div className={`rounded-lg border p-3 ${ESTILO_PRIORIDADE[recomendacao.prioridade]}`}>
      <p className={`flex items-center gap-1.5 text-sm font-semibold ${COR_TITULO[recomendacao.prioridade]}`}>
        <span className="text-[8px]">{ICONE_PRIORIDADE[recomendacao.prioridade]}</span>
        {recomendacao.titulo}
      </p>
      <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
        {recomendacao.mensagens.map((mensagem) => (
          <li key={mensagem}>{mensagem}</li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-400">
        Sugestão gerada automaticamente pelo protótipo — não substitui avaliação agronômica.
      </p>
    </div>
  )
}
