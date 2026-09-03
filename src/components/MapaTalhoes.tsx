import { useEffect } from 'react'
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { EstacaoInmet, MedicaoTempoReal, Talhao } from '../types'
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
  estacoes: EstacaoInmet[]
  medicoes: Record<string, MedicaoTempoReal>
  onSelecionarTalhao: (talhao: Talhao) => void
  talhaoFoco: Talhao
}

/**
 * Talhões têm poucas centenas de metros de lado: sem isto, o mapa abre num
 * zoom que mostra a região inteira e os polígonos somem em meia dúzia de
 * pixels. Enquadra o talhão em foco (+ sua estação) toda vez que a seleção muda.
 */
function FocoTalhao({ talhao, estacao }: { talhao: Talhao; estacao: EstacaoInmet | undefined }) {
  const map = useMap()

  useEffect(() => {
    const pontos: [number, number][] = [...talhao.poligono]
    if (estacao) pontos.push(estacao.posicao)
    map.fitBounds(pontos, { padding: [56, 56], maxZoom: 16 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talhao.id])

  return null
}

export function MapaTalhoes({
  talhoes,
  estacoes,
  medicoes,
  onSelecionarTalhao,
  talhaoFoco,
}: MapaTalhoesProps) {
  const estacaoFoco = estacoes.find((e) => e.codigo === talhaoFoco.estacaoMaisProximaCodigo)

  return (
    <MapContainer center={talhaoFoco.centro} zoom={15} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />

      <FocoTalhao talhao={talhaoFoco} estacao={estacaoFoco} />

      {talhoes.map((talhao) => (
        <Polygon
          key={talhao.id}
          positions={talhao.poligono}
          eventHandlers={{ click: () => onSelecionarTalhao(talhao) }}
          pathOptions={{
            color: STATUS_PLANTIO_COR_MAPA[talhao.statusPlantio],
            fillColor: STATUS_PLANTIO_COR_MAPA[talhao.statusPlantio],
            fillOpacity: 0.35,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{talhao.nome}</p>
              <p>{talhao.areaHa} ha · solo {talhao.tipoSolo.toLowerCase()}</p>
              <p>Umidade 0-7cm: {(talhao.umidadeSolo0_7cm * 100).toFixed(0)}%</p>
            </div>
          </Popup>
        </Polygon>
      ))}

      {estacoes.map((estacao) => {
        const medicao = medicoes[estacao.codigo]
        return (
          <Marker key={estacao.codigo} position={estacao.posicao} icon={estacaoIcon}>
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">
                  Estação {estacao.codigo} — {estacao.nome}
                </p>
                {medicao ? (
                  <>
                    <p>Vento: {medicao.ventoVelocidadeKmh.toFixed(1)} km/h</p>
                    <p>Rajada: {medicao.ventoRajadaKmh.toFixed(1)} km/h</p>
                    <p>Chuva: {medicao.precipitacaoMm.toFixed(1)} mm</p>
                  </>
                ) : (
                  <p>Sem medição recente.</p>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
