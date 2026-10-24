import { useState } from 'react'
import { Button } from '../ui/Button'
import type { UsuarioListado } from '../../types'

interface Props {
  usuario: UsuarioListado
  executando: boolean
  onConfirmar: (motivo: string) => void
  onCancelar: () => void
}

const MOTIVO_MAXIMO = 500

/** Confirmação de suspensão com motivo opcional (visto só pelo administrador). */
export function SuspenderDialog({ usuario, executando, onConfirmar, onCancelar }: Props) {
  const [motivo, setMotivo] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">Suspender conta</h2>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <strong>{usuario.nome ?? usuario.email}</strong> ({usuario.email}) perde o acesso na hora, mesmo com o
            sistema aberto. Os dados ficam guardados e voltam como estavam quando você reativar a conta.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Motivo (opcional)</label>
            <textarea
              value={motivo}
              maxLength={MOTIVO_MAXIMO}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ex.: mensalidade de outubro em atraso"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="mt-1 text-xs text-slate-400">Só você vê o motivo; a pessoa vê apenas que a conta está suspensa.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancelar} disabled={executando}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar(motivo)}
            disabled={executando}
            className="bg-red-600 hover:bg-red-700 focus-visible:outline-red-600"
          >
            {executando ? 'Aguarde…' : 'Suspender conta'}
          </Button>
        </div>
      </div>
    </div>
  )
}
