import { gerarHistorico } from '../lib/historico'
import type {
  EstacaoInmet,
  MedicaoTempoReal,
  Propriedade,
  Talhao,
} from '../types'

export const propriedades: Propriedade[] = [
  {
    id: 'prop-1',
    nome: 'Fazenda Boa Esperança',
    proprietario: 'João Bezerra',
    municipio: 'Castanhal - PA',
  },
  {
    id: 'prop-2',
    nome: 'Sítio Rio Claro',
    proprietario: 'Maria Costa',
    municipio: 'Santa Izabel do Pará - PA',
  },
]

export const estacoesInmet: EstacaoInmet[] = [
  {
    codigo: 'A201',
    nome: 'Castanhal',
    municipio: 'Castanhal - PA',
    posicao: [-1.294, -47.947],
  },
  {
    codigo: 'A211',
    nome: 'Belém',
    municipio: 'Belém - PA',
    posicao: [-1.408, -48.44],
  },
  {
    codigo: 'A249',
    nome: 'Santa Izabel',
    municipio: 'Santa Izabel do Pará - PA',
    posicao: [-1.298, -48.146],
  },
]

export const talhoes: Talhao[] = [
  {
    id: 'talhao-1',
    propriedadeId: 'prop-1',
    nome: 'Talhão Norte',
    areaHa: 42.5,
    tipoSolo: 'ARGILOSO',
    capacidadeCampo: 0.38,
    centro: [-1.286, -47.955],
    poligono: [
      [-1.281, -47.962],
      [-1.281, -47.948],
      [-1.291, -47.948],
      [-1.291, -47.962],
    ],
    statusPlantio: 'VERDE',
    umidadeSolo0_7cm: 0.34,
    estacaoMaisProximaCodigo: 'A201',
    // Chuvas recentes recarregando o solo — tendência de alta, condizente com o status Verde.
    historicoUmidade: gerarHistorico(0.34, 0.008),
  },
  {
    id: 'talhao-2',
    propriedadeId: 'prop-1',
    nome: 'Talhão Sul',
    areaHa: 28.1,
    tipoSolo: 'MISTO',
    capacidadeCampo: 0.29,
    centro: [-1.303, -47.958],
    poligono: [
      [-1.298, -47.965],
      [-1.298, -47.951],
      [-1.308, -47.951],
      [-1.308, -47.965],
    ],
    statusPlantio: 'AMARELO',
    umidadeSolo0_7cm: 0.19,
    estacaoMaisProximaCodigo: 'A201',
    // Secando de forma constante nos últimos dias — de olho no limite crítico.
    historicoUmidade: gerarHistorico(0.19, -0.01),
  },
  {
    id: 'talhao-3',
    propriedadeId: 'prop-2',
    nome: 'Talhão Rio Claro I',
    areaHa: 51.0,
    tipoSolo: 'ARENOSO',
    capacidadeCampo: 0.21,
    centro: [-1.301, -48.152],
    poligono: [
      [-1.295, -48.16],
      [-1.295, -48.144],
      [-1.307, -48.144],
      [-1.307, -48.16],
    ],
    statusPlantio: 'VERMELHO',
    umidadeSolo0_7cm: 0.08,
    estacaoMaisProximaCodigo: 'A249',
    // Queda acentuada — já abaixo da zona segura, o cenário que motivou o alerta Vermelho.
    historicoUmidade: gerarHistorico(0.08, -0.018),
  },
]

export const medicoes: Record<string, MedicaoTempoReal> = {
  A201: {
    estacaoCodigo: 'A201',
    dataHoraUtc: new Date().toISOString(),
    precipitacaoMm: 4.2,
    temperaturaC: 29.4,
    umidadePct: 78,
    ventoVelocidadeKmh: 6.5,
    ventoRajadaKmh: 11.2,
    statusPulverizacao: 'FAVORAVEL',
  },
  A211: {
    estacaoCodigo: 'A211',
    dataHoraUtc: new Date().toISOString(),
    precipitacaoMm: 0,
    temperaturaC: 31.8,
    umidadePct: 61,
    ventoVelocidadeKmh: 13.4,
    ventoRajadaKmh: 19.8,
    statusPulverizacao: 'BLOQUEIO_VENTO_FORTE',
  },
  A249: {
    estacaoCodigo: 'A249',
    dataHoraUtc: new Date().toISOString(),
    precipitacaoMm: 0.4,
    temperaturaC: 33.1,
    umidadePct: 44,
    ventoVelocidadeKmh: 2.1,
    ventoRajadaKmh: 3.0,
    statusPulverizacao: 'BLOQUEIO_INVERSAO_TERMICA',
  },
}
