import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiPost, CHAVE_AVISO_LOGIN, definirToken, EVENTO_CONTA_SUSPENSA, obterToken } from '../lib/apiClient'
import { limparCacheDados, limparCacheDeOutrosUsuarios } from '../lib/indexedDb'
import { desligarAvisosAoSair } from '../lib/push'
import { usuarioIdDoToken } from '../lib/sessao'
import type { Papel } from '../types'

const CHAVE_PAPEL = 'agroclima:papel'
// Sessão restrita do primeiro acesso: o token só serve para definir a senha nova.
const CHAVE_TROCA_SENHA = 'agroclima:troca-senha'

interface LoginResponse {
  token: string
  expira_em: string
  papel: Papel
  precisa_trocar_senha?: boolean
}

interface AuthContextValue {
  autenticado: boolean
  papel: Papel | null
  /** Login com senha temporária: só a tela de senha nova está liberada até a troca. */
  precisaTrocarSenha: boolean
  /** Devolve se a conta precisa trocar a senha antes de usar o sistema. */
  entrar: (email: string, senha: string) => Promise<{ precisaTrocarSenha: boolean }>
  trocarSenha: (senhaAtual: string, senhaNova: string) => Promise<void>
  registrar: (
    nome: string,
    email: string,
    senha: string | undefined,
    papel: Papel,
    convite?: string,
    grupo?: string,
  ) => Promise<void>
  sair: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => obterToken())
  const [papel, setPapel] = useState<Papel | null>(
    () => (localStorage.getItem(CHAVE_PAPEL) as Papel | null) ?? null,
  )

  const [precisaTrocarSenha, setPrecisaTrocarSenha] = useState<boolean>(
    () => localStorage.getItem(CHAVE_TROCA_SENHA) === '1',
  )

  // A API respondeu "conta suspensa" a qualquer requisição: encerra a sessão aqui e deixa o aviso para a tela de login.
  useEffect(() => {
    function aoSuspender(evento: Event) {
      const mensagem = (evento as CustomEvent<string>).detail
      try {
        sessionStorage.setItem(CHAVE_AVISO_LOGIN, mensagem)
      } catch {
        // sem sessionStorage o aviso some, mas a sessão encerra do mesmo jeito
      }
      localStorage.removeItem(CHAVE_PAPEL)
      localStorage.removeItem(CHAVE_TROCA_SENHA)
      void limparCacheDados()
      void desligarAvisosAoSair()
      setToken(null)
      setPapel(null)
      setPrecisaTrocarSenha(false)
    }
    window.addEventListener(EVENTO_CONTA_SUSPENSA, aoSuspender)
    return () => window.removeEventListener(EVENTO_CONTA_SUSPENSA, aoSuspender)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      autenticado: token !== null,
      papel,
      precisaTrocarSenha,
      entrar: async (email: string, senha: string) => {
        const dados = await apiPost<LoginResponse>('/api/v1/auth/login', { email, senha })
        definirToken(dados.token)
        // Entrou outro usuário no aparelho: nada do que ficou guardado de outras contas pode servir a ele.
        const usuarioId = usuarioIdDoToken(dados.token)
        if (usuarioId) void limparCacheDeOutrosUsuarios(usuarioId)
        localStorage.setItem(CHAVE_PAPEL, dados.papel)
        const trocar = dados.precisa_trocar_senha === true
        if (trocar) localStorage.setItem(CHAVE_TROCA_SENHA, '1')
        else localStorage.removeItem(CHAVE_TROCA_SENHA)
        setToken(dados.token)
        setPapel(dados.papel)
        setPrecisaTrocarSenha(trocar)
        return { precisaTrocarSenha: trocar }
      },
      trocarSenha: async (senhaAtual: string, senhaNova: string) => {
        const dados = await apiPost<LoginResponse>('/api/v1/auth/trocar-senha', {
          senha_atual: senhaAtual,
          senha_nova: senhaNova,
        })
        // Token completo novo: as demais sessões da conta caíram no servidor.
        definirToken(dados.token)
        localStorage.removeItem(CHAVE_TROCA_SENHA)
        setToken(dados.token)
        setPrecisaTrocarSenha(false)
      },
      registrar: async (
        nome: string,
        email: string,
        senha: string | undefined,
        papel: Papel,
        convite?: string,
        grupo?: string,
      ) => {
        await apiPost('/api/v1/auth/registro', { nome, email, senha, papel, convite, grupo })
      },
      sair: () => {
        // Antes de apagar o token: o aparelho deixa de receber os avisos desta conta (pode ser um aparelho compartilhado).
        void desligarAvisosAoSair()
        definirToken(null)
        void limparCacheDados()
        localStorage.removeItem(CHAVE_PAPEL)
        localStorage.removeItem(CHAVE_TROCA_SENHA)
        setToken(null)
        setPapel(null)
        setPrecisaTrocarSenha(false)
      },
    }),
    [token, papel, precisaTrocarSenha],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return contexto
}
