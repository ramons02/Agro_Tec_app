import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import type { ItemGrupo } from '../../lib/acoesGrupos'
import type { UsuarioListado } from '../../types'

interface Props {
  usuario: UsuarioListado
  grupos: ItemGrupo[]
  executando: boolean
  erro: string | null
  onMover: (grupoId: string, grupoOrigemId?: string) => void
  onCancelar: () => void
}

/** O Master move um produtor (com as propriedades dele) ou um agrônomo para outro grupo. */
export function MoverUsuarioDialog({ usuario, grupos, executando, erro, onMover, onCancelar }: Props) {
  const ehAgronomo = usuario.papel === 'AGRONOMO'
  const origens = ehAgronomo ? usuario.grupos : usuario.grupo ? [usuario.grupo] : []
  const [origem, setOrigem] = useState(origens.length === 1 ? origens[0].id : '')
  const destinos = grupos.filter((g) => !origens.some((o) => o.id === g.id) || (ehAgronomo && origens.length > 1 && g.id !== origem))
  const [destino, setDestino] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onMover(destino, ehAgronomo && origem ? origem : undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Mover para outro grupo</h2>
          <p className="mt-1 text-sm text-slate-500">
            {usuario.nome ?? usuario.email}
            {ehAgronomo
              ? ': os vínculos dele com as propriedades do grupo de origem são encerrados.'
              : ': as propriedades e talhões dele vão junto. A sessão aberta cai e ele entra de novo.'}
          </p>
        </div>

        {ehAgronomo && origens.length > 1 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Sai de qual grupo?</label>
            <select
              required
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Escolha</option>
              {origens.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Grupo de destino</label>
          <select
            required
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Escolha</option>
            {destinos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancelar} disabled={executando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={executando || !destino || (ehAgronomo && origens.length > 1 && !origem)}>
            {executando ? 'Movendo…' : 'Mover'}
          </Button>
        </div>
      </form>
    </div>
  )
}
