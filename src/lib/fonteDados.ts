const ROTULOS_FONTE: Record<string, string> = {
  AO_VIVO: 'Estação INMET (medição ao vivo)',
  CACHE_EXPIRADO: 'Última leitura (desatualizada)',
  PREVISAO: 'Previsão do modelo Open-Meteo (não é medição de estação)',
}

/** Texto para o usuário; códigos desconhecidos aparecem como vieram, nunca como "ao vivo". */
export function rotuloFonteDados(fonte: string): string {
  return ROTULOS_FONTE[fonte] ?? fonte
}
