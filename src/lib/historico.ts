import type { PontoHistoricoUmidade } from '../types'

/**
 * Série sintética determinística (sem Math.random) para o histórico de umidade:
 * termina exatamente em `valorFinal` e recua no tempo aplicando `variacaoDiaria`
 * por dia, com um ruído senoidal pequeno só pra não parecer uma reta perfeita.
 */
export function gerarHistorico(
  valorFinal: number,
  variacaoDiaria: number,
  dias = 10,
): PontoHistoricoUmidade[] {
  const hoje = new Date()
  const pontos: PontoHistoricoUmidade[] = []

  for (let i = dias - 1; i >= 0; i--) {
    const data = new Date(hoje)
    data.setDate(hoje.getDate() - i)
    const ruido = i === 0 ? 0 : Math.sin(i * 1.7) * 0.012
    const valor = valorFinal - variacaoDiaria * i + ruido

    pontos.push({
      data: data.toISOString().slice(0, 10),
      umidade: Math.max(0.03, Math.min(0.5, valor)),
    })
  }

  return pontos
}
