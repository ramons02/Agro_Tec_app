import { obterToken } from './apiClient'

/**
 * Identificador do usuário da sessão, lido do `sub` do token. Serve só para separar o que fica guardado no
 * aparelho (cache offline e fila) por usuário; quem decide o que cada um pode ver continua sendo a API.
 */
export function usuarioIdDoToken(token: string | null): string | null {
  if (!token) return null
  try {
    const corpo = token.split('.')[1]
    const json = atob(corpo.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(corpo.length / 4) * 4, '='))
    const sub = (JSON.parse(json) as { sub?: unknown }).sub
    return typeof sub === 'string' && sub ? sub : null
  } catch {
    return null
  }
}

export function usuarioAtualId(): string | null {
  return usuarioIdDoToken(obterToken())
}
