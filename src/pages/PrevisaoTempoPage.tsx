import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Card, CardBody } from '../components/ui/Card'
import { usePrevisao10Dias } from '../lib/apiHooks'
import { MUNICIPIOS_PARA, type MunicipioPara } from '../lib/municipiosPara'

const cidadeIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 18px; height: 18px; border-radius: 9999px;
    background: #059669; border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,.35);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

/** MapContainer só recebe `center` na montagem -- sem isto, trocar de cidade não move o
 * mapa (mesma limitação/solução do FocoTalhao em MapaTalhoes.tsx). */
function FocoCidade({ posicao }: { posicao: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.setView(posicao, 11)
  }, [map, posicao])

  return null
}

function formatarDia(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  const formatado = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
  return formatado.charAt(0).toUpperCase() + formatado.slice(1).replace('.', '')
}

export function PrevisaoTempoPage() {
  const [busca, setBusca] = useState('')
  const [cidade, setCidade] = useState<MunicipioPara | null>(null)

  const termoBusca = busca.trim().toLowerCase()
  const sugestoes = useMemo(() => {
    if (!termoBusca || cidade) return []
    return MUNICIPIOS_PARA.filter((m) => m.nome.toLowerCase().includes(termoBusca)).slice(0, 8)
  }, [termoBusca, cidade])

  const { dados: previsao, carregando, erro } = usePrevisao10Dias(
    cidade ? { lat: cidade.lat, lon: cidade.lng } : null,
  )

  function selecionarCidade(municipio: MunicipioPara) {
    setCidade(municipio)
    setBusca(municipio.nome)
  }

  function limparBusca() {
    setCidade(null)
    setBusca('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Previsão do Tempo</h1>
        <p className="text-sm text-slate-500">
          Busque uma cidade do Pará e veja a previsão dos próximos 10 dias (Open-Meteo).
        </p>
      </div>

      <div className="relative max-w-md">
        <input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            if (cidade) setCidade(null)
          }}
          placeholder="Buscar cidade… (ex: Marabá)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        {cidade && (
          <button
            onClick={limparBusca}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Limpar
          </button>
        )}

        {sugestoes.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {sugestoes.map((municipio) => (
              <li key={municipio.nome}>
                <button
                  onClick={() => selecionarCidade(municipio)}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50"
                >
                  {municipio.nome}
                </button>
              </li>
            ))}
          </ul>
        )}

        {termoBusca && !cidade && sugestoes.length === 0 && (
          <p className="mt-1.5 text-xs text-slate-400">
            Nenhuma cidade do Pará encontrada para "{busca}".
          </p>
        )}
      </div>

      {!cidade && (
        <p className="text-sm text-slate-400">
          Digite o nome de uma cidade acima pra ver a previsão.
        </p>
      )}

      {cidade && (
        <div className="h-[36rem] overflow-hidden rounded-xl border border-slate-200">
          <MapContainer center={[cidade.lat, cidade.lng]} zoom={11} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={17}
              maxZoom={19}
            />
            <FocoCidade posicao={[cidade.lat, cidade.lng]} />
            <Marker position={[cidade.lat, cidade.lng]} icon={cidadeIcon}>
              <Popup>{cidade.nome}</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {carregando && <p className="text-sm text-slate-400">Buscando previsão…</p>}

      {previsao && previsao.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {previsao.map((dia) => (
            <Card key={dia.data}>
              <CardBody className="space-y-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {formatarDia(dia.data)}
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {dia.temperaturaMaxC.toFixed(0)}°{' '}
                  <span className="text-sm font-normal text-slate-400">
                    {dia.temperaturaMinC.toFixed(0)}°
                  </span>
                </p>
                <div className="space-y-0.5 text-xs text-slate-500">
                  <p>Chuva: {dia.probabilidadeChuvaPct.toFixed(0)}% ({dia.precipitacaoPrevistaMm.toFixed(1)}mm)</p>
                  <p>Vento: {dia.ventoMaxKmh.toFixed(0)} km/h (rajada {dia.rajadaMaxKmh.toFixed(0)})</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
