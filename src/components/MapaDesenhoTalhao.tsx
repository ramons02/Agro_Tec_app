import { useEffect } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'

interface MapaDesenhoTalhaoProps {
  center: [number, number]
  /** Zoom inicial — mais baixo (nível de cidade) quando o centro vem só do
   * município escolhido, mais alto (nível de talhão) quando já há um ponto exato. */
  zoom?: number
  pontos: [number, number][]
  onAdicionarPonto: (ponto: [number, number]) => void
  /** Incrementa a cada importação de arquivo, para o mapa recentralizar no polígono
   * importado — sem isso, um GeoJSON de outra área do talhão fica fora da tela. */
  focoVersao?: number
}

function CapturaCliques({ onClick }: { onClick: (ponto: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

function FocoNaImportacao({
  pontos,
  focoVersao,
}: {
  pontos: [number, number][]
  focoVersao: number
}) {
  const map = useMap()

  useEffect(() => {
    if (focoVersao > 0 && pontos.length >= 3) {
      map.fitBounds(pontos, { padding: [32, 32], maxZoom: 17 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focoVersao])

  return null
}

export function MapaDesenhoTalhao({
  center,
  zoom = 16,
  pontos,
  onAdicionarPonto,
  focoVersao = 0,
}: MapaDesenhoTalhaoProps) {
  return (
    <MapContainer center={center} zoom={zoom} maxZoom={19} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={17}
      />

      <CapturaCliques onClick={onAdicionarPonto} />
      <FocoNaImportacao pontos={pontos} focoVersao={focoVersao} />

      {pontos.length >= 3 ? (
        <Polygon
          positions={pontos as LatLngExpression[]}
          pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.35, weight: 2 }}
        />
      ) : pontos.length === 2 ? (
        <Polyline
          positions={pontos as LatLngExpression[]}
          pathOptions={{ color: '#059669', weight: 2, dashArray: '6 6' }}
        />
      ) : null}

      {pontos.map((ponto, indice) => (
        <CircleMarker
          key={indice}
          center={ponto}
          radius={5}
          pathOptions={{ color: '#047857', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }}
        />
      ))}
    </MapContainer>
  )
}
