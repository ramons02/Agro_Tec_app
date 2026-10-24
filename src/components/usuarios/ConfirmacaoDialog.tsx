import type { ReactNode } from 'react'
import { Button } from '../ui/Button'

interface Props {
  titulo: string
  children: ReactNode
  rotuloConfirmar: string
  /** Ação destrutiva (recusar, suspender): botão em vermelho. */
  perigosa?: boolean
  executando?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/** Confirmação antes de uma ação de gestão que não se desfaz com um clique. */
export function ConfirmacaoDialog({
  titulo,
  children,
  rotuloConfirmar,
  perigosa = false,
  executando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        <div className="space-y-3 text-sm text-slate-600">{children}</div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancelar} disabled={executando}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirmar}
            disabled={executando}
            className={perigosa ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600' : ''}
          >
            {executando ? 'Aguarde…' : rotuloConfirmar}
          </Button>
        </div>
      </div>
    </div>
  )
}
