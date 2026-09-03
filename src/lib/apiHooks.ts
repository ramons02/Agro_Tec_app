import { useEffect, useState } from 'react'
import { apiGet, ApiError } from './apiClient'
import type { ClimaAtual, EstacaoProxima, PulverizacaoResultado } from '../types'

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
