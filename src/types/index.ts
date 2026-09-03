export type TipoSolo = 'ARGILOSO' | 'ARENOSO' | 'MISTO'

/** RD009 (provisório) — 3 papéis de usuário; ver HU-14. */
export type Papel = 'PRODUTOR_RURAL' | 'AGRONOMO' | 'GESTOR_TECNOLOGIA'

export type StatusPlantio = 'VERDE' | 'AMARELO' | 'VERMELHO'

export type StatusPulverizacao =
  | 'FAVORAVEL'
  | 'BLOQUEIO_VENTO_FORTE'
  | 'BLOQUEIO_INVERSAO_TERMICA'

export interface Propriedade {
  id: string
  nome: string
  proprietario: string
  municipio: string
}

export interface PontoHistoricoUmidade {
  data: string
  umidade: number
}

export interface Talhao {
  id: string
  propriedadeId: string
  nome: string
  areaHa: number
  tipoSolo: TipoSolo
  capacidadeCampo: number
  centro: [number, number]
  poligono: [number, number][]
  statusPlantio: StatusPlantio
  umidadeSolo0_7cm: number
  estacaoMaisProximaCodigo: string
  historicoUmidade: PontoHistoricoUmidade[]
}

export interface EstacaoInmet {
  codigo: string
  nome: string
  municipio: string
  posicao: [number, number]
}

export interface MedicaoTempoReal {
  estacaoCodigo: string
  dataHoraUtc: string
  precipitacaoMm: number
  temperaturaC: number
  umidadePct: number
  ventoVelocidadeKmh: number
  ventoRajadaKmh: number
  statusPulverizacao: StatusPulverizacao
}

export interface Notificacao {
  id: string
  estacaoCodigo: string
  estacaoNome: string
  statusAnterior: StatusPulverizacao
  statusNovo: StatusPulverizacao
  criadoEm: string
  lida: boolean
}
