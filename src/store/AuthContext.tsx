import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { apiPost, definirToken, obterToken } from '../lib/apiClient'
import type { Papel } from '../types'

const CHAVE_PAPEL = 'agroclima:papel'

interface LoginResponse {
  token: string
  expira_em: string
  papel: Papel
}

interface AuthContextValue {
  autenticado: boolean
  papel: Papel | null
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => obterToken())
  const [papel, setPapel] = useState<Papel | null>(
    () => (localStorage.getItem(CHAVE_PAPEL) as Papel | null) ?? null,
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      autenticado: token !== null,
      papel,
      entrar: async (email: string, senha: string) => {
        const dados = await apiPost<LoginResponse>('/api/v1/auth/login', { email, senha })
        definirToken(dados.token)
        localStorage.setItem(CHAVE_PAPEL, dados.papel)
        setToken(dados.token)
        setPapel(dados.papel)
      },
      sair: () => {
        definirToken(null)
        localStorage.removeItem(CHAVE_PAPEL)
        setToken(null)
        setPapel(null)
      },
    }),
    [token, papel],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return contexto
}
