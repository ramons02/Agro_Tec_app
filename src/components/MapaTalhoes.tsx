import { useEffect } from 'react'
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { EstacaoProxima, Talhao } from '../types'
import { STATUS_PLANTIO_COR_MAPA } from './ui/Badge'

const estacaoIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 16px; height: 16px; border-radius: 9999px;
    background: #0f172a; border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,.35);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

interface MapaTalhoesProps {
  talhoes: Talhao[]
  estacoesFoco: EstacaoProxima[]
  onSelecionarTalhao: (talhao: Talhao) => void
  talhaoFoco: Talhao
}

/**
 * Talhões têm poucas centenas de metros de lado: sem isto, o mapa abre num
 * zoom que mostra a região inteira e os polígonos somem em meia dúzia de
 * pixels. Enquadra o talhão em foco (+ suas estações mais próximas) toda vez
 * que a seleção muda.
 */
function FocoTalhao({ talhao, estacoes }: { talhao: Talhao; estacoes: EstacaoProxima[] }) {
  const map = useMap()

  useEffect(() => {
    const pontos: [number, number][] = [...talhao.poligono, ...estacoes.map((e) => e.posicao)]
    if (pontos.length > 0) map.fitBounds(pontos, { padding: [56, 56], maxZoom: 16 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talhao.id, estacoes.length])

  return null
}

export function MapaTalhoes({
  talhoes,
  estacoesFoco,
  onSelecionarTalhao,
  talhaoFoco,
}: MapaTalhoesProps) {
  return (
    <MapContainer center={talhaoFoco.centro} zoom={15} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />

      <FocoTalhao talhao={talhaoFoco} estacoes={estacoesFoco} />

      {talhoes.map((talhao) => (
        <Polygon
          key={talhao.id}
          positions={talhao.poligono}
          eventHandlers={{ click: () => onSelecionarTalhao(talhao) }}
          pathOptions={{
            color: talhao.statusPlantio ? STATUS_PLANTIO_COR_MAPA[talhao.statusPlantio] : '#64748b',
            fillColor: talhao.statusPlantio ? STATUS_PLANTIO_COR_MAPA[talhao.statusPlantio] : '#64748b',
            fillOpacity: 0.35,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{talhao.nome}</p>
              <p>
                {talhao.areaHa.toFixed(1)} ha
                {talhao.tipoSolo ? ` · solo ${talhao.tipoSolo.toLowerCase()}` : ''}
              </p>
            </div>
          </Popup>
        </Polygon>
      ))}

      {estacoesFoco.map((estacao) => (
        <Marker key={estacao.estacaoCodigo} position={estacao.posicao} icon={estacaoIcon}>
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">
                Estação {estacao.estacaoCodigo} — {estacao.municipio}
              </p>
              <p>{estacao.distanciaKm.toFixed(1)} km do talhão selecionado</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
