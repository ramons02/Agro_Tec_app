export type TipoSolo = 'ARGILOSO' | 'ARENOSO' | 'MISTO'

/** RD009 (provisório) — 3 papéis de usuário; ver HU-14. */
export type Papel = 'PRODUTOR_RURAL' | 'AGRONOMO' | 'GESTOR_TECNOLOGIA'

export type StatusPlantio = 'VERDE' | 'AMARELO' | 'VERMELHO'

export type StatusPulverizacao =
  | 'FAVORAVEL'
  | 'BLOQUEIO_VENTO_FORTE'
  | 'BLOQUEIO_INVERSAO_TERMICA'
  | 'BLOQUEIO_EVAPORACAO_EXCESSIVA'

export type GeometriaGeoJSON = {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: unknown
}

/** Espelha `PropriedadeRead` de `Agro_Tec_api` (`app/api/v1/endpoints/propriedades.py`). */
export interface Propriedade {
  id: string
  nome: string
  proprietarioId: string
  geometria: GeometriaGeoJSON | null
}

export interface PontoHistoricoUmidade {
  data: string
  umidade: number
}

/**
 * Espelha `TalhaoRead` de `Agro_Tec_api` (`app/api/v1/endpoints/talhoes.py`), mais os
 * campos derivados no cliente: `poligono`/`centro` (convertidos de `geometria` para o
 * formato que o Leaflet espera) e `statusPlantio`/`percentualCad` (vêm de
 * `GET /dashboard/plantio`, mesclados no talhão pelo `AppDataContext`).
 */
export interface Talhao {
  id: string
  propriedadeId: string
  nome: string
  geometria: GeometriaGeoJSON
  areaHa: number
  tipoSolo: TipoSolo | null
  capacidadeAguaDisponivelMm: number | null
  poligono: [number, number][]
  centro: [number, number]
  statusPlantio: StatusPlantio | null
  armazenamentoMm: number | null
  percentualCad: number | null
}

/** Espelha um item de `GET /talhoes/{id}/estacao-mais-proxima`. */
export interface EstacaoProxima {
  estacaoCodigo: string
  municipio: string
  distanciaKm: number
  posicao: [number, number] // [lat, lng]
}

/** Espelha `GET /clima/atual?talhao_id=` — já combinado por IDW entre as estações
 * mais próximas do talhão (Escopo V3), não é mais "por estação" isolada. */
export interface ClimaAtual {
  estacao: string
  chuvaMm: number | null
  ventoKmh: number | null
  rajadaKmh: number | null
  fonteDados: 'AO_VIVO' | 'PREVISAO' | string
  medidoEmUtc: string
}

/** Espelha `GET /talhoes/{id}/pulverizacao`. */
export interface PulverizacaoResultado {
  classificacao: StatusPulverizacao
  motivosBloqueio: StatusPulverizacao[]
  ventoKmh: number | null
  rajadaKmh: number | null
  deltaTC: number | null
  fonteDados: string
}

/** Dados só usados para alimentar a recomendação (`lib/recomendacao.ts`) e o gráfico de
 * umidade (`GraficoUmidade`) — feature 012 (Recomendação) ainda não existe na API, então
 * essa parte continua simulada localmente (decisão registrada em REQUISITOS.md). */
export interface EnriquecimentoSimulado {
  umidadeSolo0_7cm: number
  capacidadeCampo: number
  historicoUmidade: PontoHistoricoUmidade[]
}
