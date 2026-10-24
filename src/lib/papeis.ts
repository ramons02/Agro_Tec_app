import type { Papel } from '../types'

/** Admin de grupo ou Master: quem administra contas (spec 024). Produtor e agrônomo nunca. */
export function ehGestor(papel: Papel | null): boolean {
  return papel === 'GESTOR_TECNOLOGIA' || papel === 'ADMIN_MASTER'
}

/** Só o Master vê todos os grupos; o Admin vê só o dele. */
export function ehMaster(papel: Papel | null): boolean {
  return papel === 'ADMIN_MASTER'
}
