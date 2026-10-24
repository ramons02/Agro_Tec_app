export type TipoSolo = 'ARGILOSO' | 'ARENOSO' | 'MISTO'

/** RD009 (provisório) — 3 papéis de usuário; ver HU-14. */
export type Papel = 'PRODUTOR_RURAL' | 'AGRONOMO' | 'GESTOR_TECNOLOGIA'

/** Uma conta em `GET /usuarios` (só gestor). `propriedades`: produtor = as que possui;
 * agrônomo = as com vínculo aceito. */
export interface UsuarioListado {
  id: string
  nome: string | null
  email: string
  papel: Papel
  criadoEm: string
  telegramVinculado: boolean
  propriedades: number
}

/** Espelha `GET /usuarios/resumo` (só gestor). */
export interface ResumoUsuarios {
  total: number
  porPapel: Record<Papel, number>
  cadastrosSemana: number
  cadastrosMes: number
  ultimoCadastroEm: string | null
}

export interface PaginaUsuarios {
  itens: UsuarioListado[]
  total: number
  pagina: number
  tamanhoPagina: number
}

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

/** Espelha `GET /clima/atual?talhao_id=` — valor de modelo no centroide do talhão
 * (não há mais estações). */
export interface ClimaAtual {
  chuvaMm: number | null
  ventoKmh: number | null
  rajadaKmh: number | null
  fonteDados: 'PREVISAO' | 'CACHE_EXPIRADO' | string
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

/** Umidade/capacidade de campo por profundidade não têm sensor na API — só
 * essas duas estimativas continuam simuladas (marcadas "(simulado)" na tela). */
export interface EnriquecimentoSimulado {
  umidadeSolo0_7cm: number
  capacidadeCampo: number
}
