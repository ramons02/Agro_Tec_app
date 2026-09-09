import type { EnriquecimentoSimulado, StatusPlantio } from '../types'

/**
 * Não há sensor de umidade de solo por profundidade na API (`Agro_Tec_api`) --
 * só o Balanço Hídrico agregado (esse sim real, ver `useBalancoHidrico`/
 * `useBalancoHidricoHistorico`). Estes dois valores continuam alimentados por
 * um número determinístico derivado do id real do talhão (não é aleatório,
 * não muda a cada render, mas também NÃO é dado real — nunca usar fora
 * dessas duas linhas marcadas "(simulado)" na tela).
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

export function gerarEnriquecimentoSimulado(
  talhaoId: string,
  statusPlantio: StatusPlantio | null,
): EnriquecimentoSimulado {
  const status = statusPlantio ?? 'AMARELO'
  const ruido = ((hashDeterministico(talhaoId) % 21) - 10) / 1000 // ±0.010
  const umidadeSolo0_7cm = Math.max(0.03, Math.min(0.5, UMIDADE_BASE_POR_STATUS[status] + ruido))
  const capacidadeCampo = Math.max(0.15, Math.min(0.4, umidadeSolo0_7cm + 0.08))

  return { umidadeSolo0_7cm, capacidadeCampo }
}
