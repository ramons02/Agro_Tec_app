import { area, featureCollection, intersect, polygon } from '@turf/turf'
import type { Talhao } from '../types'

/**
 * Bounding box aproximada do estado do Pará (Brasil) — um retângulo, não o contorno
 * oficial: suficiente para avisar "isso parece fora do Pará" (RN016, provisório),
 * não para validação jurídica de limites territoriais.
 */
const PARA_BBOX = { latMin: -9.9, latMax: -0.9, lngMin: -58.9, lngMax: -46.0 }

/** Turf/GeoJSON usa [lng, lat]; nosso app usa [lat, lng] (convenção Leaflet). */
function paraPoligonoTurf(pontos: [number, number][]) {
  const anel = pontos.map(([lat, lng]): [number, number] => [lng, lat])
  anel.push(anel[0])
  return polygon([anel])
}

export function centroideEstaForaDoPara(pontos: [number, number][]): boolean {
  const lat = pontos.reduce((soma, p) => soma + p[0], 0) / pontos.length
  const lng = pontos.reduce((soma, p) => soma + p[1], 0) / pontos.length
  return (
    lat < PARA_BBOX.latMin || lat > PARA_BBOX.latMax || lng < PARA_BBOX.lngMin || lng > PARA_BBOX.lngMax
  )
}

const AREA_MINIMA_SOBREPOSICAO_M2 = 10

/**
 * RN015 (provisório): bloqueia sobreposição de polígono só DENTRO da mesma
 * propriedade (dois talhões de propriedades diferentes podem ter divisas em
 * disputa — isso é um problema de cadastro fundiário, não deste sistema).
 */
export function encontrarSobreposicao(
  pontosNovoTalhao: [number, number][],
  propriedadeId: string,
  talhoesExistentes: Talhao[],
): Talhao | null {
  if (pontosNovoTalhao.length < 3) return null
  const poligonoNovo = paraPoligonoTurf(pontosNovoTalhao)

  for (const talhao of talhoesExistentes) {
    if (talhao.propriedadeId !== propriedadeId) continue

    try {
      const poligonoExistente = paraPoligonoTurf(talhao.poligono)
      const intersecao = intersect(featureCollection([poligonoNovo, poligonoExistente]))
      if (intersecao && area(intersecao) > AREA_MINIMA_SOBREPOSICAO_M2) {
        return talhao
      }
    } catch {
      // Polígono degenerado (auto-interseção, < 3 pontos válidos etc.) — no
      // protótipo, ignora silenciosamente em vez de travar o cadastro.
    }
  }

  return null
}
