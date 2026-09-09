import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { area as turfArea } from '@turf/turf'
import { apiDelete, apiGet, apiPost } from '../lib/apiClient'
import { mapPropriedade, mapTalhao, mesclarStatusPlantio, type DashboardItemApi } from '../lib/apiMappers'
import { centroide, primeiroAnelParaLeaflet } from '../lib/geo'
import { lerCacheDados, salvarCacheDados } from '../lib/indexedDb'
import { aoSincronizarComSucesso, executarOuEnfileirar } from '../lib/filaSincronizacao'
import { useAuth } from './AuthContext'
import type { GeometriaGeoJSON, Propriedade, Talhao } from '../types'

interface CachePropriedadesTalhoes {
  propriedades: Propriedade[]
  talhoes: Talhao[]
}

interface ListaPaginada<T> {
  itens: T[]
  total: number
}

interface PropriedadeApiShape {
  id: string
  nome: string
  municipio: string | null
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
  criarPropriedade: (nome: string, municipio: string) => Promise<Propriedade>
  criarTalhao: (input: CriarTalhaoInput) => Promise<Talhao>
  removerTalhao: (id: string) => Promise<void>
  removerPropriedade: (id: string) => Promise<void>
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
      const propriedadesCarregadas = propRes.itens.map(mapPropriedade)
      const talhoesCarregados = mesclarStatusPlantio(talhaoRes.itens.map(mapTalhao), dashboardRes.itens)
      setPropriedades(propriedadesCarregadas)
      setTalhoes(talhoesCarregados)
      // Guarda pra navegação offline (HU-16) -- nunca guarda clima/pulverização aqui,
      // só o cadastro (propriedade/talhão), que não tem a regra de "nunca tempo real
      // obsoleto" (FR-005) porque não é um dado que expira em minutos.
      void salvarCacheDados<CachePropriedadesTalhoes>('propriedades-talhoes', {
        propriedades: propriedadesCarregadas,
        talhoes: talhoesCarregados,
      })
    } catch {
      const cache = await lerCacheDados<CachePropriedadesTalhoes>('propriedades-talhoes')
      if (cache) {
        setPropriedades(cache.dados.propriedades)
        setTalhoes(cache.dados.talhoes)
        setErro(null)
      } else {
        setErro('Não consegui carregar os dados da API. Verifique se o backend está no ar.')
      }
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

  // Uma ação enfileirada offline foi sincronizada -- recarrega do servidor pra trocar
  // qualquer placeholder local (id "local-...") pelo dado real, sem precisar reconciliar
  // id local x id do servidor aqui (US2, HU-16).
  useEffect(() => {
    if (!autenticado) return
    return aoSincronizarComSucesso(() => void recarregar())
  }, [autenticado, recarregar])

  const criarPropriedade = useCallback(async (nome: string, municipio: string) => {
    const corpo = { nome, municipio }
    const dados = await executarOuEnfileirar('POST', '/api/v1/propriedades', corpo, () =>
      apiPost<PropriedadeApiShape>('/api/v1/propriedades', corpo),
    )
    if (dados === null) {
      // Sem rede: placeholder local otimista, substituído quando a fila sincronizar.
      const propriedade: Propriedade = {
        id: `local-${Date.now()}`,
        nome,
        municipio,
        proprietarioId: 'local',
        geometria: null,
      }
      setPropriedades((atual) => [...atual, propriedade])
      return propriedade
    }
    const propriedade = mapPropriedade(dados)
    setPropriedades((atual) => [...atual, propriedade])
    return propriedade
  }, [])

  const criarTalhao = useCallback(async (input: CriarTalhaoInput) => {
    const corpo = {
      propriedade_id: input.propriedadeId,
      nome: input.nome,
      geometria: input.geometria,
      confirmar_fora_do_para: input.confirmarForaDoPara ?? false,
    }
    const dados = await executarOuEnfileirar('POST', '/api/v1/talhoes', corpo, () =>
      apiPost<TalhaoApiShape>('/api/v1/talhoes', corpo),
    )
    if (dados === null) {
      // Sem rede: área calculada localmente (turf) só pra exibição até sincronizar --
      // o valor definitivo (PostGIS ST_Area) vem no recarregar() pós-sincronização.
      const poligono = primeiroAnelParaLeaflet(input.geometria)
      const talhao: Talhao = {
        id: `local-${Date.now()}`,
        propriedadeId: input.propriedadeId,
        nome: input.nome,
        geometria: input.geometria,
        // GeometriaGeoJSON tipa `coordinates` como unknown (types/index.ts) -- turf exige
        // o shape completo de Polygon/MultiPolygon, daí o cast; é só uma estimativa local
        // até o recarregar() pós-sincronização trazer o valor definitivo (PostGIS ST_Area).
        areaHa: turfArea(input.geometria as Parameters<typeof turfArea>[0]) / 10_000,
        tipoSolo: null,
        capacidadeAguaDisponivelMm: null,
        poligono,
        centro: centroide(poligono),
        statusPlantio: null,
        armazenamentoMm: null,
        percentualCad: null,
      }
      setTalhoes((atual) => [...atual, talhao])
      return talhao
    }
    const talhao = mapTalhao(dados)
    setTalhoes((atual) => [...atual, talhao])
    return talhao
  }, [])

  const removerTalhao = useCallback(async (id: string) => {
    const caminho = `/api/v1/talhoes/${id}`
    // Sem rede: enfileira (sincroniza sozinho ao reconectar, US2) em vez de falhar --
    // a tela já reflete a remoção otimisticamente, igual ao caminho online.
    await executarOuEnfileirar('DELETE', caminho, null, () => apiDelete(caminho))
    setTalhoes((atual) => atual.filter((t) => t.id !== id))
  }, [])

  const removerPropriedade = useCallback(async (id: string) => {
    const caminho = `/api/v1/propriedades/${id}`
    await executarOuEnfileirar('DELETE', caminho, null, () => apiDelete(caminho))
    setPropriedades((atual) => atual.filter((p) => p.id !== id))
    setTalhoes((atual) => atual.filter((t) => t.propriedadeId !== id))
  }, [])

  const value = useMemo<AppDataContextValue>(
    () => ({
      propriedades,
      talhoes,
      carregando,
      erro,
      recarregar,
      criarPropriedade,
      criarTalhao,
      removerTalhao,
      removerPropriedade,
    }),
    [
      propriedades,
      talhoes,
      carregando,
      erro,
      recarregar,
      criarPropriedade,
      criarTalhao,
      removerTalhao,
      removerPropriedade,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const contexto = useContext(AppDataContext)
  if (!contexto) throw new Error('useAppData precisa estar dentro de <AppDataProvider>')
  return contexto
}
