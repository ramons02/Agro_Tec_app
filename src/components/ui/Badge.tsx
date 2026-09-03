import type { ReactNode } from 'react'
import type { StatusPlantio, StatusPulverizacao } from '../../types'

const STATUS_PLANTIO_STYLE: Record<StatusPlantio, string> = {
  VERDE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  AMARELO: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  VERMELHO: 'bg-red-50 text-red-700 ring-red-600/20',
}

const STATUS_PLANTIO_LABEL: Record<StatusPlantio, string> = {
  VERDE: 'Ideal para plantio',
  AMARELO: 'Atenção',
  VERMELHO: 'Risco',
}

const STATUS_PULVERIZACAO_STYLE: Record<StatusPulverizacao, string> = {
  FAVORAVEL: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  BLOQUEIO_VENTO_FORTE: 'bg-red-50 text-red-700 ring-red-600/20',
  BLOQUEIO_INVERSAO_TERMICA: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  BLOQUEIO_EVAPORACAO_EXCESSIVA: 'bg-orange-50 text-orange-700 ring-orange-600/20',
}

export const STATUS_PULVERIZACAO_LABEL: Record<StatusPulverizacao, string> = {
  FAVORAVEL: 'Favorável / Liberado',
  BLOQUEIO_VENTO_FORTE: 'Bloqueio: vento forte',
  BLOQUEIO_INVERSAO_TERMICA: 'Bloqueio: inversão térmica',
  BLOQUEIO_EVAPORACAO_EXCESSIVA: 'Bloqueio: evaporação excessiva',
}

function BaseBadge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  )
}

export function BadgeStatusPlantio({ status }: { status: StatusPlantio }) {
  return (
    <BaseBadge className={STATUS_PLANTIO_STYLE[status]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_PLANTIO_LABEL[status]}
    </BaseBadge>
  )
}

export function BadgeStatusPulverizacao({ status }: { status: StatusPulverizacao }) {
  return (
    <BaseBadge className={STATUS_PULVERIZACAO_STYLE[status]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_PULVERIZACAO_LABEL[status]}
    </BaseBadge>
  )
}

export const STATUS_PLANTIO_COR_MAPA: Record<StatusPlantio, string> = {
  VERDE: '#10b981',
  AMARELO: '#d97706',
  VERMELHO: '#dc2626',
}
