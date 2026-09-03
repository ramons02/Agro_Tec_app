import type { StatusPulverizacao } from '../types'

/**
 * RN001-RN003 — algoritmo oficial (`escopo/calculos-geo-metero.md`, seção 2).
 * Mais simples do que o rascunho anterior deste arquivo: "vento < 3km/h" sozinho
 * já classifica como bloqueio por inversão térmica, sem precisar de uma leitura
 * de variação de temperatura — a especificação do cliente resolveu essa lacuna.
 */
export function classificarPulverizacao(
  ventoKmh: number,
  rajadaKmh: number,
): StatusPulverizacao {
  if (ventoKmh > 10 || rajadaKmh > 15) return 'BLOQUEIO_VENTO_FORTE' // "Deriva"
  if (ventoKmh < 3) return 'BLOQUEIO_INVERSAO_TERMICA'
  return 'FAVORAVEL' // 3.0 <= vento <= 10.0 e rajada <= 15.0
}

/** v_km/h = v_m/s × 3,6 (seção 2 do documento de cálculos). */
export function converterMsParaKmh(velocidadeMs: number): number {
  return velocidadeMs * 3.6
}
