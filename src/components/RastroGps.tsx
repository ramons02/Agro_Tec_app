import { useEffect, useRef, useState } from 'react'
import { distanciaMetros, foraDoParaAproximado } from '../lib/coordenadas'
import { Button } from './ui/Button'

/** Leituras piores que isto (metros) são ignoradas: um vértice ruim estraga a área do talhão. */
const PRECISAO_MAXIMA_M = 20
const ESPACAMENTOS_M = [5, 10, 20, 50]

interface RastroGpsProps {
  /** Último vértice já marcado (por qualquer meio), para medir o espaçamento. */
  ultimoVertice: [number, number] | undefined
  onAdicionarVertice: (ponto: [number, number]) => void
  onPosicao: (posicao: { lat: number; lng: number; precisaoM: number }) => void
}

type WakeLockSentinelLike = { release: () => Promise<void> }

/**
 * Grava os vértices do talhão enquanto a pessoa anda pela divisa: a cada `espacamento` metros percorridos, com
 * GPS bom, um vértice novo entra no polígono. Mantém a tela acesa (o navegador não rastreia com a tela apagada).
 */
export function RastroGps({ ultimoVertice, onAdicionarVertice, onPosicao }: RastroGpsProps) {
  const [gravando, setGravando] = useState(false)
  const [espacamento, setEspacamento] = useState(10)
  const [precisaoM, setPrecisaoM] = useState<number>()
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const idGps = useRef<number | null>(null)
  const telaAcesa = useRef<WakeLockSentinelLike | null>(null)
  // O callback do GPS vive além do render: lê sempre o valor mais recente por estas referências.
  const ultimoRef = useRef(ultimoVertice)
  const espacamentoRef = useRef(espacamento)
  const adicionarRef = useRef(onAdicionarVertice)
  const posicaoRef = useRef(onPosicao)
  useEffect(() => {
    ultimoRef.current = ultimoVertice
    espacamentoRef.current = espacamento
    adicionarRef.current = onAdicionarVertice
    posicaoRef.current = onPosicao
  })

  async function manterTelaAcesa() {
    try {
      const wakeLock = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock
      if (wakeLock) telaAcesa.current = await wakeLock.request('screen')
    } catch {
      // Sem Wake Lock (navegador antigo, bateria baixa): o rastro segue, só a tela pode apagar.
    }
  }

  function soltarTela() {
    void telaAcesa.current?.release().catch(() => undefined)
    telaAcesa.current = null
  }

  function parar() {
    if (idGps.current !== null) navigator.geolocation.clearWatch(idGps.current)
    idGps.current = null
    soltarTela()
    setGravando(false)
  }

  useEffect(() => parar, [])

  // O sistema solta o Wake Lock quando a aba some; ao voltar, pede de novo.
  useEffect(() => {
    if (!gravando) return
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void manterTelaAcesa()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [gravando])

  function iniciar() {
    setErro(null)
    setAviso(null)
    if (!('geolocation' in navigator)) {
      setErro('Este aparelho ou navegador não oferece localização.')
      return
    }
    setGravando(true)
    void manterTelaAcesa()
    idGps.current = navigator.geolocation.watchPosition(
      (pos) => {
        const ponto = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        const precisao = pos.coords.accuracy
        setPrecisaoM(precisao)
        posicaoRef.current({ ...ponto, precisaoM: precisao })

        if (precisao > PRECISAO_MAXIMA_M) {
          setAviso(`Esperando o GPS melhorar (±${Math.round(precisao)} m, preciso de até ${PRECISAO_MAXIMA_M} m).`)
          return
        }
        if (foraDoParaAproximado(ponto)) {
          setAviso('Você está fora do estado do Pará. Este ponto não foi marcado.')
          return
        }
        setAviso(null)
        const ultimo = ultimoRef.current
        if (!ultimo || distanciaMetros({ lat: ultimo[0], lng: ultimo[1] }, ponto) >= espacamentoRef.current) {
          adicionarRef.current([ponto.lat, ponto.lng])
          ultimoRef.current = [ponto.lat, ponto.lng]
        }
      },
      (e) => {
        parar()
        setErro(
          e.code === e.PERMISSION_DENIED
            ? 'A localização está bloqueada. Libere a permissão do site nas configurações do navegador.'
            : 'Não consegui obter a localização.',
        )
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-700">Marcar andando pela divisa</p>
      <p className="text-xs text-slate-500">
        Caminhe pelo contorno do talhão com o aparelho na mão. Um vértice entra a cada distância escolhida, sempre com
        o GPS bom. A tela fica acesa enquanto grava.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="espacamentoRastro" className="text-sm text-slate-600">
          Um ponto a cada
        </label>
        <select
          id="espacamentoRastro"
          value={espacamento}
          disabled={gravando}
          onChange={(e) => setEspacamento(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-2 text-base"
        >
          {ESPACAMENTOS_M.map((m) => (
            <option key={m} value={m}>
              {m} m
            </option>
          ))}
        </select>
        <Button type="button" variant={gravando ? 'secondary' : 'primary'} onClick={gravando ? parar : iniciar}>
          {gravando ? 'Parar de gravar' : 'Começar a gravar'}
        </Button>
      </div>
      {gravando && precisaoM !== undefined && (
        <p className="text-xs text-slate-500">Gravando… precisão atual de ±{Math.round(precisaoM)} m.</p>
      )}
      {aviso && <p className="text-xs text-amber-700">{aviso}</p>}
      {erro && <p className="text-xs text-red-700">{erro}</p>}
    </div>
  )
}
