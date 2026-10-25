export type TipoSolo = 'ARGILOSO' | 'ARENOSO' | 'MISTO'

/** RD009 (provisório) — 3 papéis de usuário; ver HU-14. */
/** `GESTOR_TECNOLOGIA` é o Admin de um grupo; `ADMIN_MASTER` é o dono da plataforma (spec 024). */
export type Papel = 'PRODUTOR_RURAL' | 'AGRONOMO' | 'GESTOR_TECNOLOGIA' | 'ADMIN_MASTER'

/** Estado da conta (spec 022): PENDENTE -> ATIVA <-> SUSPENSA. */
export type StatusConta = 'PENDENTE' | 'ATIVA' | 'SUSPENSA'

/** Senha temporária devolvida uma única vez por confirmar, criar e redefinir (nunca é guardada). */
export interface SenhaTemporaria {
  id: string
  nome: string | null
  email: string
  senhaTemporaria: string
  expiraEm: string
}

/** Uma conta em `GET /usuarios` (só gestor). `propriedades`: produtor = as que possui;
 * agrônomo = as com vínculo aceito. */
export interface UsuarioListado {
  id: string
  nome: string | null
  email: string
  papel: Papel
  status: StatusConta
  criadoEm: string
  telegramVinculado: boolean
  propriedades: number
  /** Quando a pessoa pediu nova senha na tela de login; null = sem pedido pendente. */
  senhaEsquecidaEm: string | null
  /** Grupo do produtor e do Admin; null para o agrônomo (que usa `grupos`) e para o pendente sem grupo. */
  grupo: GrupoResumo | null
  /** Grupos do agrônomo (pode ter vários). */
  grupos: GrupoResumo[]
}

export interface GrupoResumo {
  id: string
  nome: string
}

/** Espelha `GET /usuarios/resumo` (só gestor). */
export interface ResumoUsuarios {
  total: number
  porPapel: Record<Papel, number>
  cadastrosSemana: number
  cadastrosMes: number
  ultimoCadastroEm: string | null
  pendentes: number
  senhasEsquecidas: number
}

/** Ações de gestão registradas na auditoria (espelha `AcaoAuditoria` da API). */
export type AcaoAuditoria =
  | 'CONFIRMAR'
  | 'RECUSAR'
  | 'CRIAR'
  | 'SUSPENDER'
  | 'REATIVAR'
  | 'REDEFINIR_SENHA'
  | 'EDITAR'
  | 'SENHA_ESQUECIDA'

export interface EventoHistorico {
  acao: AcaoAuditoria
  atorNome: string
  detalhe: string | null
  criadoEm: string
}

/** `GET /usuarios/{id}`: a conta (nunca com senha) e o histórico de ações, do mais recente ao mais antigo. */
export interface DetalheUsuario {
  id: string
  nome: string | null
  email: string
  papel: Papel
  status: StatusConta
  precisaTrocarSenha: boolean
  motivoSuspensao: string | null
  criadoEm: string
  historico: EventoHistorico[]
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
  /** Grupo (cliente) da propriedade; nulo em propriedade antiga sem grupo. */
  grupo?: { id: string; nome: string } | null
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

/** Espelha um dia de `GET /previsao` (busca de cidade) — previsão futura,
 * diferente do Balanço Hídrico (que só usa dado medido). Campo que a fonte não
 * entregou vem `null` (nunca 0): a tela mostra "—". */
export interface PrevisaoDia {
  data: string
  temperaturaMinC: number | null
  temperaturaMaxC: number | null
  precipitacaoPrevistaMm: number | null
  probabilidadeChuvaPct: number | null
  ventoMaxKmh: number | null
  rajadaMaxKmh: number | null
}

/** Fonte usada na previsão: a principal (Open-Meteo) ou a reserva (MET Norway). */
export type FontePrevisao = 'OPEN_METEO' | 'MET_NORWAY'

export interface PrevisaoResultado {
  fonte: FontePrevisao
  dias: PrevisaoDia[]
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

/** Solo do talhão vindo da API: textura e CAD do SoilGrids e umidade do modelo do Open-Meteo.
 * O que a API não tem vem nulo; a tela mostra "sem dado", nunca um número inventado. */
export interface SoloTalhao {
  tipoSolo: TipoSolo | null
  capacidadeAguaDisponivelMm: number | null
  /** Capacidade de campo calculada da textura real, em %. */
  capacidadeCampoPct: number | null
  /** Umidade volumétrica do solo 0-7 cm na hora atual (modelo, não sensor), em %. */
  umidade0a7cmPct: number | null
  umidade7a28cmPct: number | null
  /** O SoilGrids ainda não respondeu para este talhão; a API busca em segundo plano. */
  soloPendente: boolean
}
