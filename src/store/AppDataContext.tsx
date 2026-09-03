import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiDelete, apiGet, apiPost } from '../lib/apiClient'
import { mapPropriedade, mapTalhao, mesclarStatusPlantio, type DashboardItemApi } from '../lib/apiMappers'
import { useAuth } from './AuthContext'
import type { GeometriaGeoJSON, Propriedade, Talhao } from '../types'

interface ListaPaginada<T> {
  itens: T[]
  total: number
}

interface PropriedadeApiShape {
  id: string
  nome: string
  proprietario_id: string
  geometria: GeometriaGeoJSON | null
}

interface TalhaoApiShape {
  id: string
  propriedade_id: string
  nome: string
  geometria: GeometriaGeoJSON
  area_ha: number
  tipo_solo: Talhao['tipoSolo']
  capacidade_agua_disponivel_mm: number | null
}

interface CriarTalhaoInput {
  propriedadeId: string
  nome: string
  geometria: GeometriaGeoJSON
  confirmarForaDoPara?: boolean
}

interface AppDataContextValue {
  propriedades: Propriedade[]
  talhoes: Talhao[]
  carregando: boolean
  erro: string | null
  recarregar: () => Promise<void>
  criarPropriedade: (nome: string) => Promise<Propriedade>
  criarTalhao: (input: CriarTalhaoInput) => Promise<Talhao>
  removerTalhao: (id: string) => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { autenticado } = useAuth()
  const [propriedades, setPropriedades] = useState<Propriedade[]>([])
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [propRes, talhaoRes, dashboardRes] = await Promise.all([
        apiGet<ListaPaginada<PropriedadeApiShape>>('/api/v1/propriedades?page_size=100'),
        apiGet<ListaPaginada<TalhaoApiShape>>('/api/v1/talhoes?page_size=100'),
        apiGet<ListaPaginada<DashboardItemApi>>('/api/v1/dashboard/plantio?page_size=100'),
      ])
      setPropriedades(propRes.itens.map(mapPropriedade))
      setTalhoes(mesclarStatusPlantio(talhaoRes.itens.map(mapTalhao), dashboardRes.itens))
    } catch {
      setErro('Não consegui carregar os dados da API. Verifique se o backend está no ar.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (autenticado) void recarregar()
    else {
      setPropriedades([])
      setTalhoes([])
    }
  }, [autenticado, recarregar])

  const criarPropriedade = useCallback(async (nome: string) => {
    const dados = await apiPost<PropriedadeApiShape>('/api/v1/propriedades', { nome })
    const propriedade = mapPropriedade(dados)
    setPropriedades((atual) => [...atual, propriedade])
    return propriedade
  }, [])

  const criarTalhao = useCallback(async (input: CriarTalhaoInput) => {
    const dados = await apiPost<TalhaoApiShape>('/api/v1/talhoes', {
      propriedade_id: input.propriedadeId,
      nome: input.nome,
      geometria: input.geometria,
      confirmar_fora_do_para: input.confirmarForaDoPara ?? false,
    })
    const talhao = mapTalhao(dados)
    setTalhoes((atual) => [...atual, talhao])
    return talhao
  }, [])

  const removerTalhao = useCallback(async (id: string) => {
    await apiDelete(`/api/v1/talhoes/${id}`)
    setTalhoes((atual) => atual.filter((t) => t.id !== id))
  }, [])

  const value = useMemo<AppDataContextValue>(
    () => ({ propriedades, talhoes, carregando, erro, recarregar, criarPropriedade, criarTalhao, removerTalhao }),
    [propriedades, talhoes, carregando, erro, recarregar, criarPropriedade, criarTalhao, removerTalhao],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const contexto = useContext(AppDataContext)
  if (!contexto) throw new Error('useAppData precisa estar dentro de <AppDataProvider>')
  return contexto
}
