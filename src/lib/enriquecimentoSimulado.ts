import { gerarHistorico } from './historico'
import type { EnriquecimentoSimulado, StatusPlantio } from '../types'

/**
 * Feature 012 (Recomendação) e a série histórica de umidade do solo ainda não
 * existem na API (`Agro_Tec_api`) — ver "Impacto no backend" em
 * `requisitos/REQUISITOS.md`. Enquanto isso, `PainelRecomendacao` e
 * `GraficoUmidade` continuam alimentados por um valor determinístico derivado
 * do id real do talhão (não é aleatório, não muda a cada render, mas também
 * NÃO é dado real — nunca usar fora desses dois componentes).
 */
function hashDeterministico(texto: string): number {
  let hash = 0
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0
  }
  return hash
}

const UMIDADE_BASE_POR_STATUS: Record<StatusPlantio, number> = {
  VERDE: 0.32,
  AMARELO: 0.2,
  VERMELHO: 0.09,
}

const TENDENCIA_POR_STATUS: Record<StatusPlantio, number> = {
  VERDE: 0.006,
  AMARELO: -0.006,
  VERMELHO: -0.016,
}

export function gerarEnriquecimentoSimulado(
  talhaoId: string,
  statusPlantio: StatusPlantio | null,
): EnriquecimentoSimulado {
  const status = statusPlantio ?? 'AMARELO'
  const ruido = ((hashDeterministico(talhaoId) % 21) - 10) / 1000 // ±0.010
  const umidadeSolo0_7cm = Math.max(0.03, Math.min(0.5, UMIDADE_BASE_POR_STATUS[status] + ruido))
  const capacidadeCampo = Math.max(0.15, Math.min(0.4, umidadeSolo0_7cm + 0.08))

  return {
    umidadeSolo0_7cm,
    capacidadeCampo,
    historicoUmidade: gerarHistorico(umidadeSolo0_7cm, TENDENCIA_POR_STATUS[status]),
  }
}
