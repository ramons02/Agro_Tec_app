import { useEffect, useRef, useState } from 'react'
import { MUNICIPIOS_PARA } from '../lib/municipiosPara'
import { foraDoParaAproximado, formatarCoordenada, lerCoordenada, type Coordenada } from '../lib/coordenadas'
import { Button } from './ui/Button'

/** Acima disto (metros) o GPS ainda não está bom o bastante para marcar um vértice. */
const PRECISAO_MAXIMA_VERTICE_M = 30

export interface Referencia extends Coordenada {
  precisaoM?: number
}

interface BuscaDeLocalProps {
  onIrPara: (centro: [number, number], zoom: number) => void
  onReferencia: (referencia: Referencia | undefined) => void
  onAdicionarVertice: (ponto: [number, number]) => void
}

/** Sem acento e sem diferenciar maiúsculas, para "maraba" achar "Marabá". */
function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

/**
 * Campo único do passo da geometria: aceita o nome de uma cidade ou uma coordenada ("-5.37, -49.12") e
 * oferece "Usar minha localização" (GPS do aparelho, que funciona sem internet).
 */
export function BuscaDeLocal({ onIrPara, onReferencia, onAdicionarVertice }: BuscaDeLocalProps) {
  const [texto, setTexto] = useState('')
  const [coordenada, setCoordenada] = useState<Coordenada>()
  const [erroTexto, setErroTexto] = useState<string | null>(null)
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [gps, setGps] = useState<Referencia>()
  const [erroGps, setErroGps] = useState<string | null>(null)
  const idGps = useRef<number | null>(null)

  function pararGps() {
    if (idGps.current !== null) navigator.geolocation.clearWatch(idGps.current)
    idGps.current = null
    setBuscandoGps(false)
  }

  useEffect(() => pararGps, [])

  function aoDigitar(valor: string) {
    setTexto(valor)
    setErroTexto(null)
    setCoordenada(undefined)
    setGps(undefined)

    const lida = lerCoordenada(valor)
    if (lida.tipo === 'ok') {
      setCoordenada(lida.coordenada)
      onReferencia(lida.coordenada)
      onIrPara([lida.coordenada.lat, lida.coordenada.lng], 16)
      return
    }
    onReferencia(undefined)
    if (lida.tipo === 'invalido') {
      setErroTexto(lida.mensagem)
      return
    }
    const alvo = semAcento(valor)
    const municipio = alvo ? MUNICIPIOS_PARA.find((m) => semAcento(m.nome) === alvo) : undefined
    if (municipio) onIrPara([municipio.lat, municipio.lng], 13)
  }

  function usarMinhaLocalizacao() {
    setErroGps(null)
    if (!('geolocation' in navigator)) {
      setErroGps('Este aparelho ou navegador não oferece localização.')
      return
    }
    pararGps()
    setCoordenada(undefined)
    setBuscandoGps(true)
    let primeira = true
    // watchPosition refina a leitura: o primeiro ponto costuma ser grosseiro e melhora em segundos.
    idGps.current = navigator.geolocation.watchPosition(
      (pos) => {
        const ref = { lat: pos.coords.latitude, lng: pos.coords.longitude, precisaoM: pos.coords.accuracy }
        setGps(ref)
        onReferencia(ref)
        if (primeira) {
          primeira = false
          onIrPara([ref.lat, ref.lng], 17)
        }
      },
      (erro) => {
        pararGps()
        setErroGps(
          erro.code === erro.PERMISSION_DENIED
            ? 'A localização está bloqueada. Libere a permissão do site nas configurações do navegador.'
            : erro.code === erro.TIMEOUT
              ? 'Não consegui o sinal do GPS a tempo. Vá a céu aberto e tente de novo.'
              : 'Não consegui obter a localização.',
        )
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    )
  }

  const alvo = coordenada ?? gps
  const fora = alvo ? foraDoParaAproximado(alvo) : false
  const precisaoRuim = gps?.precisaoM !== undefined && gps.precisaoM > PRECISAO_MAXIMA_VERTICE_M

  return (
    <div className="space-y-2">
      <label htmlFor="buscaDeLocal" className="block text-sm font-medium text-slate-700">
        Ir para uma cidade ou coordenada
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="buscaDeLocal"
          list="cidadesDoPara"
          value={texto}
          onChange={(e) => aoDigitar(e.target.value)}
          placeholder="Marabá ou -5.37, -49.12"
          autoComplete="off"
          inputMode="text"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={buscandoGps ? pararGps : usarMinhaLocalizacao}
        >
          {buscandoGps ? 'Parar GPS' : 'Usar minha localização'}
        </Button>
      </div>
      <datalist id="cidadesDoPara">
        {MUNICIPIOS_PARA.map((m) => (
          <option key={m.nome} value={m.nome} />
        ))}
      </datalist>

      {erroTexto && <p className="text-xs text-red-700">{erroTexto}</p>}
      {erroGps && <p className="text-xs text-red-700">{erroGps}</p>}
      {buscandoGps && !gps && <p className="text-xs text-slate-500">Procurando o sinal do GPS…</p>}

      {alvo && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-slate-700">
            <span className="font-medium">{gps ? 'Sua posição' : 'Ponto'}:</span> {formatarCoordenada(alvo)}
            {gps?.precisaoM !== undefined && <span className="text-slate-500"> (precisão de ±{Math.round(gps.precisaoM)} m)</span>}
          </p>
          {fora && (
            <p className="text-red-700">
              Este ponto está fora do estado do Pará. O talhão precisa ficar inteiramente dentro do Pará.
            </p>
          )}
          {precisaoRuim && !fora && (
            <p className="text-amber-700">
              Precisão ainda baixa. Vá a céu aberto e espere o número diminuir para marcar o vértice.
            </p>
          )}
          <Button
            type="button"
            disabled={fora || precisaoRuim}
            onClick={() => onAdicionarVertice([alvo.lat, alvo.lng])}
          >
            Marcar como vértice
          </Button>
        </div>
      )}

      <p className="text-xs text-slate-500">
        O mapa já abre na cidade da propriedade. O GPS funciona sem internet, mas a imagem de satélite só aparece onde já
        foi carregada antes.
      </p>
    </div>
  )
}
