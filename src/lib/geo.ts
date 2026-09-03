import type { GeometriaGeoJSON } from '../types'

type Anel = [number, number][] // [lng, lat] — ordem GeoJSON

/** GeoJSON usa [lng, lat]; Leaflet usa [lat, lng] — todo ponto que cruza essa
 * fronteira passa por aqui, pra nunca inverter a ordem por engano. */
function anelParaLeaflet(anel: Anel): [number, number][] {
  return anel.map(([lng, lat]) => [lat, lng])
}

/** Converte um GeoJSON `{type: "Point", coordinates: [lng, lat]}` (ex.:
 * posição de estação) para o par `[lat, lng]` que o Leaflet espera. */
export function pontoGeoJSONParaLeaflet(ponto: { coordinates: [number, number] }): [number, number] {
  const [lng, lat] = ponto.coordinates
  return [lat, lng]
}

/** Extrai o anel externo do primeiro polígono (Polygon ou MultiPolygon) para
 * desenhar no mapa. Um MultiPolygon com várias partes desconexas (Escopo V3)
 * mostra só a primeira parte aqui — não há hoje um `<Polygon>` do Leaflet que
 * desenhe multi-partes de uma vez; ver `poligonosParaLeaflet` para todas elas. */
export function primeiroAnelParaLeaflet(geometria: GeometriaGeoJSON): [number, number][] {
  if (geometria.type === 'Polygon') {
    return anelParaLeaflet((geometria.coordinates as Anel[])[0])
  }
  const partes = geometria.coordinates as Anel[][]
  return anelParaLeaflet(partes[0]?.[0] ?? [])
}

/** Todas as partes de um MultiPolygon (ou a única parte de um Polygon), cada
 * uma como um anel pronto pro Leaflet — usado para desenhar geometrias com
 * múltiplas partes desconexas por completo. */
export function poligonosParaLeaflet(geometria: GeometriaGeoJSON): [number, number][][] {
  if (geometria.type === 'Polygon') {
    return [anelParaLeaflet((geometria.coordinates as Anel[])[0])]
  }
  const partes = geometria.coordinates as Anel[][]
  return partes.map((parte) => anelParaLeaflet(parte[0]))
}

export function centroide(pontosLatLng: [number, number][]): [number, number] {
  if (pontosLatLng.length === 0) return [0, 0]
  const lat = pontosLatLng.reduce((soma, p) => soma + p[0], 0) / pontosLatLng.length
  const lng = pontosLatLng.reduce((soma, p) => soma + p[1], 0) / pontosLatLng.length
  return [lat, lng]
}

/** Constrói um GeoJSON Polygon a partir de pontos desenhados no Leaflet
 * ([lat,lng]), fechando o anel — formato que `POST /propriedades` e
 * `POST /talhoes` esperam. */
export function pontosLeafletParaPolygon(pontosLatLng: [number, number][]): GeometriaGeoJSON {
  const anel: Anel = pontosLatLng.map(([lat, lng]): [number, number] => [lng, lat])
  const fechado = anel.length > 0 ? [...anel, anel[0]] : anel
  return { type: 'Polygon', coordinates: [fechado] }
}

export function distanciaKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return R * 2 * Math.asin(Math.sqrt(h))
}
