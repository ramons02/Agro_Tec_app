import type { GrupoResumo } from '../lib/grupos'
import { SEM_GRUPO, TODOS_OS_GRUPOS } from '../lib/grupos'

interface FiltroDeGrupoProps {
  grupos: GrupoResumo[]
  valor: string
  aoMudar: (valor: string) => void
  /** Há propriedade sem grupo na lista (então a opção "Sem grupo" faz sentido). */
  haSemGrupo?: boolean
}

/** Filtro por grupo, só para o Master (o único que enxerga mais de um grupo ao mesmo tempo). */
export function FiltroDeGrupo({ grupos, valor, aoMudar, haSemGrupo = false }: FiltroDeGrupoProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="font-medium">Grupo</span>
      <select
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
      >
        <option value={TODOS_OS_GRUPOS}>Todos os grupos</option>
        {grupos.map((g) => (
          <option key={g.id} value={g.id}>
            {g.nome}
          </option>
        ))}
        {haSemGrupo && <option value={SEM_GRUPO}>Sem grupo</option>}
      </select>
    </label>
  )
}
