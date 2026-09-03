import { useEffect } from 'react'
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { EstacaoMapa, Talhao } from '../types'
import { STATUS_PLANTIO_COR_MAPA, STATUS_PLANTIO_LABEL } from './ui/Badge'

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
  estacoes: EstacaoMapa[]
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

export function MapaTalhoes({ talhoes, estacoes, onSelecionarTalhao, talhaoFoco }: MapaTalhoesProps) {
  return (
    <MapContainer center={talhaoFoco.centro} zoom={15} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
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

      {estacoes.map((estacao) => (
        <Marker key={estacao.codigo} position={estacao.posicao} icon={estacaoIcon}>
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">
                Estação {estacao.codigo} — {estacao.municipio}
              </p>
              {estacao.ultimaMedicao ? (
                <>
                  <p>Chuva: {estacao.ultimaMedicao.chuvaMm !== null ? `${estacao.ultimaMedicao.chuvaMm.toFixed(1)} mm` : '—'}</p>
                  <p>Vento: {estacao.ultimaMedicao.ventoKmh !== null ? `${estacao.ultimaMedicao.ventoKmh.toFixed(1)} km/h` : '—'}</p>
                  <p className="text-xs text-slate-500">Fonte: {estacao.ultimaMedicao.fonteDados}</p>
                </>
              ) : (
                <p>Sem medição recente.</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
