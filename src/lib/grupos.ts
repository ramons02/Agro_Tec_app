import type { Propriedade } from '../types'

export interface GrupoResumo {
  id: string
  nome: string
}

/** Valor do filtro que não restringe nada. */
export const TODOS_OS_GRUPOS = 'TODOS'

/** Sem grupo: propriedade antiga que ainda não foi atribuída a nenhum cliente. */
export const SEM_GRUPO = 'SEM_GRUPO'

/** Grupos que aparecem nas propriedades carregadas, sem repetir e em ordem alfabética. */
export function gruposDasPropriedades(propriedades: Propriedade[]): GrupoResumo[] {
  const porId = new Map<string, GrupoResumo>()
  for (const p of propriedades) if (p.grupo) porId.set(p.grupo.id, p.grupo)
  return [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** A propriedade pertence ao grupo escolhido no filtro? */
export function propriedadeNoGrupo(propriedade: Propriedade | undefined, filtro: string): boolean {
  if (filtro === TODOS_OS_GRUPOS) return true
  if (!propriedade) return false
  return filtro === SEM_GRUPO ? !propriedade.grupo : propriedade.grupo?.id === filtro
}
