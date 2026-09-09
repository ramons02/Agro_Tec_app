import { useEffect, useState } from 'react'
import { apiGet, ApiError } from './apiClient'
import { pontoGeoJSONParaLeaflet } from './geo'
import type {
  BalancoHidricoResultado,
  ClimaAtual,
  EstacaoMapa,
  EstacaoProxima,
  PrevisaoDia,
  PulverizacaoResultado,
  RecomendacaoResultado,
} from '../types'

interface EstadoConsulta<T> {
  dados: T | null
  carregando: boolean
  erro: string | null
}

interface EstacoesProximasApi {
  estacoes: {
    estacao_codigo: string
    municipio: string
    distancia_km: number
    latitude: number
    longitude: number
  }[]
}

/** As 3 estações INMET mais próximas do talhão (Escopo V3, RF035) — usadas na
 * interpolação IDW do clima atual. `null` enquanto carrega ou se não há
 * estação cadastrada perto o suficiente. */
export function useEstacoesProximas(talhaoId: string | null): EstadoConsulta<EstacaoProxima[]> {
  const [estado, setEstado] = useState<EstadoConsulta<EstacaoProxima[]>>({
    dados: null,
    carregando: false,
    erro: null,
  })

  useEffect(() => {
    if (!talhaoId) return
    let cancelado = false
    setEstado({ dados: null, carregando: true, erro: null })

    apiGet<EstacoesProximasApi>(`/api/v1/talhoes/${talhaoId}/estacao-mais-proxima`)
      .then((resposta) => {
        if (cancelado) return
        setEstado({
          dados: resposta.estacoes.map((e) => ({
            estacaoCodigo: e.estacao_codigo,
            municipio: e.municipio,
            distanciaKm: e.distancia_km,
            posicao: [e.latitude, e.longitude] as [number, number],
          })),
          carregando: false,
          erro: null,
        })
      })
      .catch((erro: unknown) => {
        if (cancelado) return
        const mensagem = erro instanceof ApiError && erro.codigo === 404 ? null : 'Falha ao buscar estações.'
        setEstado({ dados: [], carregando: false, erro: mensagem })
      })

    return () => {
      cancelado = true
    }
  }, [talhaoId])

  return estado
}

interface ClimaAtualApi {
  estacao: string
  chuva_mm: number | null
  vento_kmh: number | null
  rajada_kmh: number | null
  fonte_dados: string
  medido_em_utc: string
}

/** Clima atual do talhão (feature 008, já combinado por IDW — Escopo V3).
 * `intervaloMs` reconsulta periodicamente (RN008: nunca serve dado >30min sem
 * tentar atualizar) — 0 desativa o polling. */
export function useClimaAtual(talhaoId: string | null, intervaloMs = 0): EstadoConsulta<ClimaAtual> {
  const [estado, setEstado] = useState<EstadoConsulta<ClimaAtual>>({
    dados: null,
    carregando: false,
    erro: null,
  })

  useEffect(() => {
    if (!talhaoId) return
    let cancelado = false

    async function buscar() {
      setEstado((atual) => ({ ...atual, carregando: true }))
      try {
        const resposta = await apiGet<ClimaAtualApi>(`/api/v1/clima/atual?talhao_id=${talhaoId}`)
        if (cancelado) return
        setEstado({
          dados: {
            estacao: resposta.estacao,
            chuvaMm: resposta.chuva_mm,
            ventoKmh: resposta.vento_kmh,
            rajadaKmh: resposta.rajada_kmh,
            fonteDados: resposta.fonte_dados,
            medidoEmUtc: resposta.medido_em_utc,
          },
          carregando: false,
          erro: null,
        })
      } catch (erro) {
        if (cancelado) return
        const mensagem =
          erro instanceof ApiError && erro.codigo === 404 ? null : 'Falha ao buscar clima atual.'
        setEstado({ dados: null, carregando: false, erro: mensagem })
      }
    }

    void buscar()
    if (intervaloMs <= 0) return () => { cancelado = true }

    const id = setInterval(() => void buscar(), intervaloMs)
    return () => {
      cancelado = true
      clearInterval(id)
    }
  }, [talhaoId, intervaloMs])

  return estado
}

interface PulverizacaoApi {
  classificacao: PulverizacaoResultado['classificacao']
  motivos_bloqueio: PulverizacaoResultado['classificacao'][]
  vento_kmh: number | null
  rajada_kmh: number | null
  delta_t_c: number | null
  fonte_dados: string
}

/** Classificação da janela de pulverização do talhão (feature 009 — vento +
 * Delta T, Escopo V3). */
export function usePulverizacao(talhaoId: string | null, versao = 0): EstadoConsulta<PulverizacaoResultado> {
  const [estado, setEstado] = useState<EstadoConsulta<PulverizacaoResultado>>({
    dados: null,
    carregando: false,
    erro: null,
  })

  useEffect(() => {
    if (!talhaoId) return
    let cancelado = false
    setEstado({ dados: null, carregando: true, erro: null })

    apiGet<PulverizacaoApi>(`/api/v1/talhoes/${talhaoId}/pulverizacao`)
      .then((resposta) => {
        if (cancelado) return
        setEstado({
          dados: {
            classificacao: resposta.classificacao,
            motivosBloqueio: resposta.motivos_bloqueio,
            ventoKmh: resposta.vento_kmh,
            rajadaKmh: resposta.rajada_kmh,
            deltaTC: resposta.delta_t_c,
            fonteDados: resposta.fonte_dados,
          },
          carregando: false,
          erro: null,
        })
      })
      .catch((erro: unknown) => {
        if (cancelado) return
        const mensagem =
          erro instanceof ApiError && erro.codigo === 404 ? null : 'Falha ao classificar a pulverização.'
        setEstado({ dados: null, carregando: false, erro: mensagem })
      })

    return () => {
      cancelado = true
    }
  }, [talhaoId, versao])

  return estado
}

interface RecomendacaoApi {
  texto: string
  prioridade: RecomendacaoResultado['prioridade']
  aviso: string
}

/** Recomendação de próximo passo do talhão (feature 012) — combina status de
 * plantio e pulverização, calculado no backend. */
export function useRecomendacao(talhaoId: string | null): EstadoConsulta<RecomendacaoResultado> {
  const [estado, setEstado] = useState<EstadoConsulta<RecomendacaoResultado>>({
    dados: null,
    carregando: false,
    erro: null,
  })

  useEffect(() => {
    if (!talhaoId) return
    let cancelado = false
    setEstado({ dados: null, carregando: true, erro: null })

    apiGet<RecomendacaoApi>(`/api/v1/talhoes/${talhaoId}/recomendacao`)
      .then((resposta) => {
        if (cancelado) return
        setEstado({ dados: resposta, carregando: false, erro: null })
      })
      .catch((erro: unknown) => {
        if (cancelado) return
        const mensagem =
          erro instanceof ApiError && erro.codigo === 404 ? null : 'Falha ao buscar recomendação.'
        setEstado({ dados: null, carregando: false, erro: mensagem })
      })

    return () => {
      cancelado = true
    }
  }, [talhaoId])

  return estado
}

interface BalancoHidricoApi {
  data: string
  armazenamento_mm: number
  cad_mm: number
  percentual_cad: number
  precipitacao_mm: number
  evapotranspiracao_mm: number
}

/** Último cálculo diário do Balanço Hídrico do talhão (feature 010) — mostra a
 * chuva medida e a evapotranspiração usadas, pra dar visibilidade real do dado
 * que decide o status de plantio (não só o % da CAD já resumido). */
export function useBalancoHidrico(talhaoId: string | null): EstadoConsulta<BalancoHidricoResultado> {
  const [estado, setEstado] = useState<EstadoConsulta<BalancoHidricoResultado>>({
    dados: null,
    carregando: false,
    erro: null,
  })

  useEffect(() => {
    if (!talhaoId) return
    let cancelado = false
    setEstado({ dados: null, carregando: true, erro: null })

    apiGet<BalancoHidricoApi>(`/api/v1/talhoes/${talhaoId}/balanco-hidrico`)
      .then((resposta) => {
        if (cancelado) return
        setEstado({
          dados: {
            data: resposta.data,
            armazenamentoMm: resposta.armazenamento_mm,
            cadMm: resposta.cad_mm,
            percentualCad: resposta.percentual_cad,
            precipitacaoMm: resposta.precipitacao_mm,
            evapotranspiracaoMm: resposta.evapotranspiracao_mm,
          },
          carregando: false,
          erro: null,
        })
      })
      .catch((erro: unknown) => {
        if (cancelado) return
        const mensagem =
          erro instanceof ApiError && erro.codigo === 404 ? null : 'Falha ao buscar balanço hídrico.'
        setEstado({ dados: null, carregando: false, erro: mensagem })
      })

    return () => {
      cancelado = true
    }
  }, [talhaoId])

  return estado
}

interface PrevisaoApi {
  dias: {
    data: string
    temperatura_min_c: number
    temperatura_max_c: number
    precipitacao_prevista_mm: number
    probabilidade_chuva_pct: number
    vento_max_kmh: number
    rajada_max_kmh: number
  }[]
}

/** Previsão de 10 dias por coordenada (`GET /previsao`) — busca de cidade, sem
 * relação com talhão/propriedade. `coordenada` nulo desativa a busca. */
export function usePrevisao10Dias(
  coordenada: { lat: number; lon: number } | null,
): EstadoConsulta<PrevisaoDia[]> {
  const [estado, setEstado] = useState<EstadoConsulta<PrevisaoDia[]>>({
    dados: null,
    carregando: false,
    erro: null,
  })

  useEffect(() => {
    if (!coordenada) return
    let cancelado = false
    setEstado({ dados: null, carregando: true, erro: null })

    apiGet<PrevisaoApi>(`/api/v1/previsao?lat=${coordenada.lat}&lon=${coordenada.lon}`)
      .then((resposta) => {
        if (cancelado) return
        setEstado({
          dados: resposta.dias.map((dia) => ({
            data: dia.data,
            temperaturaMinC: dia.temperatura_min_c,
            temperaturaMaxC: dia.temperatura_max_c,
            precipitacaoPrevistaMm: dia.precipitacao_prevista_mm,
            probabilidadeChuvaPct: dia.probabilidade_chuva_pct,
            ventoMaxKmh: dia.vento_max_kmh,
            rajadaMaxKmh: dia.rajada_max_kmh,
          })),
          carregando: false,
          erro: null,
        })
      })
      .catch((erro: unknown) => {
        if (cancelado) return
        setEstado({
          dados: null,
          carregando: false,
          erro: erro instanceof ApiError ? erro.message : 'Falha ao buscar previsão do tempo.',
        })
      })

    return () => {
      cancelado = true
    }
  }, [coordenada?.lat, coordenada?.lon])

  return estado
}

interface DadosMapaApi {
  estacoes: {
    codigo: string
    municipio: string
    posicao_geojson: { type: 'Point'; coordinates: [number, number] }
    ultima_medicao: { chuva_mm: number | null; vento_kmh: number | null; fonte_dados: string } | null
  }[]
}

/** Todas as estações do mapa (feature 007, FR-001) — visão geral, diferente
 * de `useEstacoesProximas` (as 3 mais próximas de um talhão específico). */
export function useEstacoesDoMapa(ativo: boolean): EstadoConsulta<EstacaoMapa[]> {
  const [estado, setEstado] = useState<EstadoConsulta<EstacaoMapa[]>>({
    dados: null,
    carregando: false,
    erro: null,
  })

  useEffect(() => {
    if (!ativo) return
    let cancelado = false
    setEstado({ dados: null, carregando: true, erro: null })

    apiGet<DadosMapaApi>('/api/v1/mapa/dados')
      .then((resposta) => {
        if (cancelado) return
        setEstado({
          dados: resposta.estacoes.map((e) => ({
            codigo: e.codigo,
            municipio: e.municipio,
            posicao: pontoGeoJSONParaLeaflet(e.posicao_geojson),
            ultimaMedicao: e.ultima_medicao
              ? {
                  chuvaMm: e.ultima_medicao.chuva_mm,
                  ventoKmh: e.ultima_medicao.vento_kmh,
                  fonteDados: e.ultima_medicao.fonte_dados,
                }
              : null,
          })),
          carregando: false,
          erro: null,
        })
      })
      .catch(() => {
        if (cancelado) return
        setEstado({ dados: null, carregando: false, erro: 'Falha ao buscar estações do mapa.' })
      })

    return () => {
      cancelado = true
    }
  }, [ativo])

  return estado
}
