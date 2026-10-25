/** Caixa que contém o Pará, com folga de ~5 km. Só serve para dizer "fora"; dentro da caixa pode ser outro estado. */
const CAIXA_PARA = { latMin: -9.9, latMax: 2.65, lngMin: -58.95, lngMax: -46.0 }

export interface Coordenada {
  lat: number
  lng: number
}

export type ResultadoCoordenada =
  | { tipo: 'ok'; coordenada: Coordenada }
  | { tipo: 'invalido'; mensagem: string }
  | { tipo: 'nenhuma' }

export function foraDoParaAproximado({ lat, lng }: Coordenada): boolean {
  return lat < CAIXA_PARA.latMin || lat > CAIXA_PARA.latMax || lng < CAIXA_PARA.lngMin || lng > CAIXA_PARA.lngMax
}

/**
 * Lê "latitude, longitude" em graus decimais, nos formatos que as pessoas copiam do Google Maps, do GPS e
 * do CAR: "-5.37, -49.12", "-5,37 -49,12", "(-5.37, -49.12)". Texto que não tem cara de coordenada
 * ("Marabá") volta como `nenhuma`, para a busca por cidade seguir o caminho dela.
 */
export function lerCoordenada(texto: string): ResultadoCoordenada {
  const limpo = texto.replace(/−/g, '-').trim()
  if (!/^[\s\d.,;()+\-°]+$/.test(limpo) || !/\d/.test(limpo)) return { tipo: 'nenhuma' }

  const numeros = limpo.match(/[+-]?\d+(?:[.,]\d+)?/g)
  if (!numeros || numeros.length < 2) {
    return { tipo: 'invalido', mensagem: 'Informe a latitude e a longitude, por exemplo -5.37, -49.12.' }
  }
  if (numeros.length > 2) {
    return { tipo: 'invalido', mensagem: 'Use só dois números: latitude e longitude em graus decimais, por exemplo -5.37, -49.12.' }
  }

  const [lat, lng] = numeros.map((n) => Number(n.replace(',', '.')))
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { tipo: 'invalido', mensagem: 'Latitude vai de -90 a 90 e longitude de -180 a 180.' }
  }
  // Pará: latitude de +2,6 a -9,8 e longitude de -58,9 a -46,0. Os dois são negativos na maior parte do estado.
  if (foraDoParaAproximado({ lat, lng }) && !foraDoParaAproximado({ lat: lng, lng: lat })) {
    return { tipo: 'invalido', mensagem: 'Parece que latitude e longitude estão trocadas. Escreva a latitude primeiro.' }
  }
  return { tipo: 'ok', coordenada: { lat, lng } }
}

export function formatarCoordenada({ lat, lng }: Coordenada): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
