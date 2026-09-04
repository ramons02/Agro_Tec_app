import { centroide, primeiroAnelParaLeaflet } from './geo'
import type { GeometriaGeoJSON, Propriedade, StatusPlantio, Talhao, TipoSolo } from '../types'

interface PropriedadeApi {
  id: string
  nome: string
  municipio: string | null
  proprietario_id: string
  geometria: GeometriaGeoJSON | null
}

export function mapPropriedade(dados: PropriedadeApi): Propriedade {
  return {
    id: dados.id,
    nome: dados.nome,
    municipio: dados.municipio,
    proprietarioId: dados.proprietario_id,
    geometria: dados.geometria,
  }
}

interface TalhaoApi {
  id: string
  propriedade_id: string
  nome: string
  geometria: GeometriaGeoJSON
  area_ha: number
  tipo_solo: TipoSolo | null
  capacidade_agua_disponivel_mm: number | null
}

export function mapTalhao(dados: TalhaoApi): Talhao {
  const poligono = primeiroAnelParaLeaflet(dados.geometria)
  return {
    id: dados.id,
    propriedadeId: dados.propriedade_id,
    nome: dados.nome,
    geometria: dados.geometria,
    areaHa: dados.area_ha,
    tipoSolo: dados.tipo_solo,
    capacidadeAguaDisponivelMm: dados.capacidade_agua_disponivel_mm,
    poligono,
    centro: centroide(poligono),
    statusPlantio: null,
    armazenamentoMm: null,
    percentualCad: null,
  }
}

export interface DashboardItemApi {
  talhao_id: string
  status_plantio: StatusPlantio | null
  armazenamento_mm: number | null
  percentual_cad: number | null
}

/** Mescla o status de plantio (de `GET /dashboard/plantio`, feature 011) nos
 * talhões já carregados (de `GET /talhoes`, feature 005) — são duas chamadas
 * porque são dois agregados diferentes na API, calculados por serviços
 * diferentes (cadastro vs. balanço hídrico diário). */
export function mesclarStatusPlantio(talhoes: Talhao[], itensDashboard: DashboardItemApi[]): Talhao[] {
  const porId = new Map(itensDashboard.map((item) => [item.talhao_id, item]))
  return talhoes.map((talhao) => {
    const item = porId.get(talhao.id)
    if (!item) return talhao
    return {
      ...talhao,
      statusPlantio: item.status_plantio,
      armazenamentoMm: item.armazenamento_mm,
      percentualCad: item.percentual_cad,
    }
  })
}
