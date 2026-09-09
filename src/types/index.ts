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
  municipio: string | null
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

export type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA'

/** Espelha um dia de `GET /previsao` (busca de cidade) — previsão futura da
 * Open-Meteo, diferente do Balanço Hídrico (que só usa dado medido). */
export interface PrevisaoDia {
  data: string
  temperaturaMinC: number
  temperaturaMaxC: number
  precipitacaoPrevistaMm: number
  probabilidadeChuvaPct: number
  ventoMaxKmh: number
  rajadaMaxKmh: number
}

/** Espelha `GET /talhoes/{id}/recomendacao` (feature 012) — combina status de
 * plantio e pulverização num texto único, calculado no backend. */
export interface RecomendacaoResultado {
  texto: string
  prioridade: Prioridade
  aviso: string
}

/** Espelha `GET /talhoes/{id}/balanco-hidrico` (feature 010) — o cálculo diário
 * mais recente, com a chuva medida e a evapotranspiração que entraram na conta. */
export interface BalancoHidricoResultado {
  data: string
  armazenamentoMm: number
  cadMm: number
  percentualCad: number
  precipitacaoMm: number
  evapotranspiracaoMm: number
}

/** Espelha uma estação em `GET /mapa/dados` (feature 007) — visão geral do
 * mapa, com a última medição para o popup (FR-003). Diferente de
 * `EstacaoProxima`: aqui não há conceito de "mais próxima de um talhão", é a
 * lista completa de estações (infraestrutura pública, sem RBAC). */
export interface EstacaoMapa {
  codigo: string
  municipio: string
  posicao: [number, number] // [lat, lng]
  ultimaMedicao: {
    chuvaMm: number | null
    ventoKmh: number | null
    fonteDados: string
  } | null
}

/** Dados só usados para alimentar o gráfico de umidade (`GraficoUmidade`) —
 * não há endpoint de série histórica de umidade do solo na API; a
 * Recomendação (feature 012) em si já é real, vem de `useRecomendacao`. */
export interface EnriquecimentoSimulado {
  umidadeSolo0_7cm: number
  capacidadeCampo: number
  historicoUmidade: PontoHistoricoUmidade[]
}
