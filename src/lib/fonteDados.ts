const ROTULOS_FONTE: Record<string, string> = {
  CACHE_EXPIRADO: 'Última leitura (desatualizada)',
  PREVISAO: 'Previsão de modelo meteorológico (não é medição de estação)',
}

/** Texto para o usuário; códigos desconhecidos aparecem como vieram, nunca como "ao vivo". */
export function rotuloFonteDados(fonte: string): string {
  return ROTULOS_FONTE[fonte] ?? fonte
}
