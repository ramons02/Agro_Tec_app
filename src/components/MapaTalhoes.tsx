import { useEffect } from 'react'
import { MapContainer, Polygon, Popup, TileLayer, useMap } from 'react-leaflet'
import type { Talhao } from '../types'
import { STATUS_PLANTIO_COR_MAPA, STATUS_PLANTIO_LABEL } from './ui/Badge'

interface MapaTalhoesProps {
  talhoes: Talhao[]
  onSelecionarTalhao: (talhao: Talhao) => void
  talhaoFoco: Talhao
}

/**
 * Talhões têm poucas centenas de metros de lado: sem isto, o mapa abre num
 * zoom que mostra a região inteira e os polígonos somem em meia dúzia de
 * pixels. Enquadra só o talhão em foco — as estações (feature 007, todas do
 * Pará) podem estar a dezenas ou centenas de km e NÃO entram no cálculo do
 * zoom, ou uma delas forçaria a vista a se afastar até incluí-la.
 */
function FocoTalhao({ talhao }: { talhao: Talhao }) {
  const map = useMap()

  useEffect(() => {
    if (talhao.poligono.length > 0) {
      map.fitBounds(talhao.poligono, { padding: [56, 56], maxZoom: 16 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talhao.id])

  return null
}

export function MapaTalhoes({ talhoes, onSelecionarTalhao, talhaoFoco }: MapaTalhoesProps) {
  return (
    <MapContainer center={talhaoFoco.centro} zoom={15} maxZoom={19} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={17}
      />

      <FocoTalhao talhao={talhaoFoco} />

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
              <p>{talhao.statusPlantio ? STATUS_PLANTIO_LABEL[talhao.statusPlantio] : 'Sem status calculado ainda'}</p>
            </div>
          </Popup>
        </Polygon>
      ))}
    </MapContainer>
  )
}
