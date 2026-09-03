import type { StatusPlantio } from '../types'

/**
 * Implementação de referência de `escopo/calculos-geo-metero.md` (seção 4) —
 * fiel à fórmula oficial do cliente, para reaproveitar no backend real quando
 * houver CAD/ARM/ET0/Kc de verdade por talhão.
 *
 * NÃO está religada aos talhões mockados do protótipo: os 3 talhões de demo já
 * têm um status Verde/Amarelo/Vermelho calibrado manualmente para contar uma
 * história clara na validação com o cliente (ver `src/mocks/data.ts`), e os
 * campos mockados (`capacidadeCampo` como fração, não CAD em mm) não têm a
 * mesma unidade que esta fórmula espera — religar os dois exigiria refazer o
 * mock inteiro em mm, o que foge do propósito de um protótipo de UX.
 */

/** CAD = (CC − PMP) × ρs × z — todos em mm ao final (ρs em g/cm³, z em mm). */
export function calcularCAD(
  capacidadeCampoFracao: number,
  pontoMurchaPermanenteFracao: number,
  densidadeSoloGCm3: number,
  profundidadeRaizesMm: number,
): number {
  return (capacidadeCampoFracao - pontoMurchaPermanenteFracao) * densidadeSoloGCm3 * profundidadeRaizesMm
}

/** ARM_i = min(CAD, max(0, ARM_{i-1} + P_i − ET_i)), com ET_i = ET0 × Kc. */
export function calcularArmazenamento(
  armazenamentoAnteriorMm: number,
  precipitacaoMm: number,
  et0Mm: number,
  coeficienteCultivoKc: number,
  cadMm: number,
): number {
  const etReal = et0Mm * coeficienteCultivoKc
  const armBruto = armazenamentoAnteriorMm + precipitacaoMm - etReal
  return Math.min(cadMm, Math.max(0, armBruto))
}

/**
 * Matriz de decisão da janela de plantio, em % de CAD. A especificação oficial
 * deixa duas faixas implícitas sem categoria (90-95% de CAD; e 60-90% de CAD
 * mas com chuva prevista < 5mm) — tratadas aqui como Amarelo por serem faixas
 * intermediárias, nunca como Vermelho (que é reservado às duas condições de
 * risco explícitas: seca ou encharcamento).
 */
export function classificarStatusPlantio(
  armazenamentoMm: number,
  cadMm: number,
  previsaoChuvaMm: number,
): StatusPlantio {
  const percentualCad = armazenamentoMm / cadMm

  if (percentualCad < 0.3 || percentualCad > 0.95) return 'VERMELHO'
  if (percentualCad >= 0.6 && percentualCad <= 0.9 && previsaoChuvaMm >= 5) return 'VERDE'
  return 'AMARELO'
}
