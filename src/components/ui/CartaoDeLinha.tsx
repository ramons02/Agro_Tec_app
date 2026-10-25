import type { ReactNode } from 'react'

interface CampoDoCartao {
  rotulo: string
  valor: ReactNode
}

interface CartaoDeLinhaProps {
  titulo: ReactNode
  subtitulo?: ReactNode
  /** Selo ao lado do título (estado da conta, por exemplo). */
  selo?: ReactNode
  campos?: CampoDoCartao[]
  /** Botões da linha, os mesmos da tabela. */
  acoes?: ReactNode
}

/**
 * Cartão que ocupa o lugar de uma linha de tabela abaixo de 768 px (spec 027, FR-011): título e subtítulo no
 * topo, campos rotulados empilhados e as ações no fim. Texto longo (e-mails, nomes) quebra em vez de empurrar o
 * layout para o lado.
 */
export function CartaoDeLinha({ titulo, subtitulo, selo, campos = [], acoes }: CartaoDeLinhaProps) {
  return (
    <li className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-slate-900">{titulo}</p>
          {subtitulo && <p className="break-all text-xs text-slate-500">{subtitulo}</p>}
        </div>
        {selo && <div className="shrink-0">{selo}</div>}
      </div>

      {campos.length > 0 && (
        <dl className="space-y-1.5 text-sm">
          {campos.map((campo) => (
            <div key={campo.rotulo} className="flex justify-between gap-3">
              <dt className="shrink-0 text-slate-500">{campo.rotulo}</dt>
              <dd className="min-w-0 break-words text-right font-medium text-slate-800">{campo.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {acoes && <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">{acoes}</div>}
    </li>
  )
}
