import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { MapaDesenhoTalhao } from '../components/MapaDesenhoTalhao'
import { gerarHistorico } from '../lib/historico'
import { centroideEstaForaDoPara, encontrarSobreposicao } from '../lib/validacaoGeometria'
import { estacoesInmet } from '../mocks/data'
import { useAppData } from '../store/AppDataContext'
import type { Propriedade, Talhao, TipoSolo } from '../types'

type Etapa = 'DADOS' | 'GEOMETRIA' | 'SOLO'

const NOVA_PROPRIEDADE = '__NOVA__'

const SOLO_PREVIEW: Record<TipoSolo, { argila: number; areia: number; cad: number }> = {
  ARGILOSO: { argila: 52, areia: 18, cad: 0.38 },
  MISTO: { argila: 28, areia: 40, cad: 0.29 },
  ARENOSO: { argila: 12, areia: 68, cad: 0.19 },
}

const CENTRO_PADRAO: [number, number] = [-1.295, -47.955]

function centroide(pontos: [number, number][]): [number, number] {
  const lat = pontos.reduce((soma, p) => soma + p[0], 0) / pontos.length
  const lng = pontos.reduce((soma, p) => soma + p[1], 0) / pontos.length
  return [lat, lng]
}

// Shoelace em coordenadas aproximadas por metros (projeção equirretangular) — precisão
// de sobra para a escala de um talhão, sem precisar de uma lib de geodésia no protótipo.
function calcularAreaHa(pontos: [number, number][]): number {
  if (pontos.length < 3) return 0
  const latRef = pontos[0][0]
  const metrosPorGrauLat = 110540
  const metrosPorGrauLng = 111320 * Math.cos((latRef * Math.PI) / 180)
  const coordsMetros = pontos.map(
    ([lat, lng]): [number, number] => [lng * metrosPorGrauLng, lat * metrosPorGrauLat],
  )
  let area = 0
  for (let i = 0; i < coordsMetros.length; i++) {
    const [x1, y1] = coordsMetros[i]
    const [x2, y2] = coordsMetros[(i + 1) % coordsMetros.length]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area / 2) / 10000
}

function distanciaKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return R * 2 * Math.asin(Math.sqrt(h))
}

function estacaoMaisProxima(centro: [number, number]): string {
  return estacoesInmet.reduce((maisProxima, estacao) =>
    distanciaKm(centro, estacao.posicao) < distanciaKm(centro, maisProxima.posicao)
      ? estacao
      : maisProxima,
  ).codigo
}

function removerFechamentoDuplicado(pontos: [number, number][]): [number, number][] {
  if (pontos.length > 1) {
    const [latInicial, lngInicial] = pontos[0]
    const [latFinal, lngFinal] = pontos[pontos.length - 1]
    if (latInicial === latFinal && lngInicial === lngFinal) return pontos.slice(0, -1)
  }
  return pontos
}

/** Aceita Polygon/MultiPolygon crus, Feature ou FeatureCollection — o suficiente pra
 * um GeoJSON exportado por QGIS, Google Earth ou o próprio SIG do produtor. */
function extrairPoligonoDeGeoJSON(json: unknown): [number, number][] | null {
  function pontosDoAnel(coordenadas: unknown): [number, number][] | null {
    if (!Array.isArray(coordenadas)) return null
    return coordenadas.map(([lng, lat]: [number, number]): [number, number] => [lat, lng])
  }

  function poligonoDaGeometria(geometria: unknown): [number, number][] | null {
    if (!geometria || typeof geometria !== 'object') return null
    const g = geometria as { type?: string; coordinates?: unknown }
    if (g.type === 'Polygon' && Array.isArray(g.coordinates)) {
      return pontosDoAnel(g.coordinates[0])
    }
    if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) {
      const primeiroPoligono = g.coordinates[0] as unknown[]
      return pontosDoAnel(primeiroPoligono?.[0])
    }
    return null
  }

  if (!json || typeof json !== 'object') return null
  const obj = json as { type?: string; features?: unknown[]; geometry?: unknown }

  if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
    for (const feature of obj.features) {
      const poligono = poligonoDaGeometria((feature as { geometry?: unknown }).geometry)
      if (poligono) return poligono
    }
    return null
  }

  if (obj.type === 'Feature') {
    return poligonoDaGeometria(obj.geometry)
  }

  return poligonoDaGeometria(obj)
}

export function CadastroTalhaoPage() {
  const navigate = useNavigate()
  const { propriedades, talhoes, adicionarPropriedade, adicionarTalhao } = useAppData()

  const [etapa, setEtapa] = useState<Etapa>('DADOS')
  const [nome, setNome] = useState('')
  const [propriedadeId, setPropriedadeId] = useState<string>(propriedades[0].id)
  const [novaPropriedadeNome, setNovaPropriedadeNome] = useState('')
  const [novaPropriedadeProprietario, setNovaPropriedadeProprietario] = useState('')
  const [novaPropriedadeMunicipio, setNovaPropriedadeMunicipio] = useState('')
  const [pontos, setPontos] = useState<[number, number][]>([])
  const [focoVersaoImportacao, setFocoVersaoImportacao] = useState(0)
  const [erroImportacao, setErroImportacao] = useState<string | null>(null)
  const [tipoSolo, setTipoSolo] = useState<TipoSolo | null>(null)
  const [consultandoSolo, setConsultandoSolo] = useState(false)

  const inputArquivoRef = useRef<HTMLInputElement>(null)

  const criandoNovaPropriedade = propriedadeId === NOVA_PROPRIEDADE

  function centroDaPropriedade(id: string): [number, number] {
    return talhoes.find((t) => t.propriedadeId === id)?.centro ?? CENTRO_PADRAO
  }

  function irParaGeometria(event: FormEvent) {
    event.preventDefault()

    if (criandoNovaPropriedade) {
      const novaPropriedade: Propriedade = {
        id: `prop-${Date.now()}`,
        nome: novaPropriedadeNome,
        proprietario: novaPropriedadeProprietario,
        municipio: novaPropriedadeMunicipio,
      }
      adicionarPropriedade(novaPropriedade)
      setPropriedadeId(novaPropriedade.id)
    }

    setEtapa('GEOMETRIA')
  }

  function adicionarPonto(ponto: [number, number]) {
    setErroImportacao(null)
    setPontos((atual) => [...atual, ponto])
  }

  function desfazerUltimoPonto() {
    setPontos((atual) => atual.slice(0, -1))
  }

  function limparPontos() {
    setPontos([])
    setErroImportacao(null)
  }

  function acionarSeletorDeArquivo() {
    inputArquivoRef.current?.click()
  }

  function handleArquivoSelecionado(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0]
    event.target.value = ''
    if (!arquivo) return

    const leitor = new FileReader()
    leitor.onload = () => {
      try {
        const json = JSON.parse(String(leitor.result))
        const poligono = extrairPoligonoDeGeoJSON(json)
        if (!poligono || poligono.length < 3) {
          setErroImportacao('Não encontrei um polígono válido nesse arquivo GeoJSON.')
          return
        }
        setPontos(removerFechamentoDuplicado(poligono))
        setFocoVersaoImportacao((atual) => atual + 1)
        setErroImportacao(null)
      } catch {
        setErroImportacao('Arquivo inválido — envie um .geojson bem formado.')
      }
    }
    leitor.onerror = () => setErroImportacao('Não consegui ler esse arquivo.')
    leitor.readAsText(arquivo)
  }

  function confirmarGeometria() {
    const sobreposto = encontrarSobreposicao(pontos, propriedadeId, talhoes)
    if (sobreposto) {
      setErroImportacao(
        `Esse polígono se sobrepõe ao talhão "${sobreposto.nome}", já cadastrado nesta propriedade.`,
      )
      return
    }

    if (centroideEstaForaDoPara(pontos)) {
      const confirmado = window.confirm(
        'Esse talhão parece estar fora do estado do Pará. Confirma o cadastro mesmo assim?',
      )
      if (!confirmado) return
    }

    setErroImportacao(null)
    setEtapa('SOLO')
    setConsultandoSolo(true)
    // Simula a consulta automática à API SoilGrids (HU-04) a partir da coordenada central.
    setTimeout(() => {
      setTipoSolo('MISTO')
      setConsultandoSolo(false)
    }, 1200)
  }

  function finalizarCadastro() {
    if (tipoSolo) {
      const centro = centroide(pontos)
      const novoTalhao: Talhao = {
        id: `talhao-${Date.now()}`,
        propriedadeId,
        nome,
        areaHa: Math.round(calcularAreaHa(pontos) * 10) / 10,
        tipoSolo,
        capacidadeCampo: SOLO_PREVIEW[tipoSolo].cad,
        centro,
        poligono: pontos,
        statusPlantio: 'AMARELO', // recém-cadastrado: ainda sem histórico de umidade acumulado
        umidadeSolo0_7cm: 0.22,
        estacaoMaisProximaCodigo: estacaoMaisProxima(centro),
        historicoUmidade: gerarHistorico(0.22, -0.004),
      }
      adicionarTalhao(novoTalhao)
      navigate('/mapa', { state: { talhaoId: novoTalhao.id } })
      return
    }
    navigate('/mapa')
  }

  const ETAPAS: Array<{ id: Etapa; label: string }> = [
    { id: 'DADOS', label: '1. Dados básicos' },
    { id: 'GEOMETRIA', label: '2. Geometria' },
    { id: 'SOLO', label: '3. Solo (automático)' },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Cadastrar Talhão</h1>
        <p className="text-sm text-slate-500">
          Delimite o talhão e deixe a textura do solo ser preenchida automaticamente (HU-05
          e HU-04).
        </p>
      </div>

      <div className="flex items-center gap-2">
        {ETAPAS.map((e, i) => (
          <div key={e.id} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                e.id === etapa
                  ? 'bg-emerald-600 text-white'
                  : ETAPAS.findIndex((x) => x.id === etapa) > i
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i + 1}
            </div>
            <span className="text-xs font-medium text-slate-500">{e.label}</span>
            {i < ETAPAS.length - 1 && <div className="h-px flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>

      {etapa === 'DADOS' && (
        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-slate-900">Dados básicos</p>
          </CardHeader>
          <CardBody>
            <form className="space-y-4" onSubmit={irParaGeometria}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Propriedade
                </label>
                <select
                  value={propriedadeId}
                  onChange={(e) => setPropriedadeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {propriedades.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                  <option value={NOVA_PROPRIEDADE}>+ Cadastrar nova propriedade</option>
                </select>
              </div>

              {criandoNovaPropriedade && (
                <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Nova propriedade
                  </p>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Nome da propriedade
                    </label>
                    <input
                      required
                      value={novaPropriedadeNome}
                      onChange={(e) => setNovaPropriedadeNome(e.target.value)}
                      placeholder="Ex: Fazenda Santa Luzia"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Proprietário
                    </label>
                    <input
                      required
                      value={novaPropriedadeProprietario}
                      onChange={(e) => setNovaPropriedadeProprietario(e.target.value)}
                      placeholder="Ex: Ana Ferreira"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Município
                    </label>
                    <input
                      required
                      value={novaPropriedadeMunicipio}
                      onChange={(e) => setNovaPropriedadeMunicipio(e.target.value)}
                      placeholder="Ex: Igarapé-Açu - PA"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nome do talhão
                </label>
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Talhão Leste"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <Button type="submit" className="w-full">
                Continuar
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {etapa === 'GEOMETRIA' && (
        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-slate-900">Delimitar o talhão</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-xs text-slate-500">
              Clique no mapa para marcar os vértices do polígono (mínimo 3 pontos), ou
              importe um GeoJSON já pronto.
            </p>

            <div className="h-72 overflow-hidden rounded-lg border border-slate-200">
              <MapaDesenhoTalhao
                center={centroDaPropriedade(propriedadeId)}
                pontos={pontos}
                onAdicionarPonto={adicionarPonto}
                focoVersao={focoVersaoImportacao}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">
                {pontos.length} ponto{pontos.length === 1 ? '' : 's'} marcado
                {pontos.length === 1 ? '' : 's'}
              </span>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={desfazerUltimoPonto}
                  disabled={pontos.length === 0}
                  className="font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40"
                >
                  Desfazer último ponto
                </button>
                <button
                  type="button"
                  onClick={limparPontos}
                  disabled={pontos.length === 0}
                  className="font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40"
                >
                  Limpar
                </button>
              </div>
            </div>

            {erroImportacao && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {erroImportacao}
              </p>
            )}

            <div className="flex gap-3">
              <input
                ref={inputArquivoRef}
                type="file"
                accept=".geojson,.json,application/geo+json,application/json"
                onChange={handleArquivoSelecionado}
                className="hidden"
              />
              <Button variant="secondary" className="flex-1" onClick={acionarSeletorDeArquivo}>
                Importar GeoJSON
              </Button>
              <Button
                className="flex-1"
                disabled={pontos.length < 3}
                onClick={confirmarGeometria}
              >
                Confirmar geometria
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {etapa === 'SOLO' && (
        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-slate-900">
              Parametrização automática de solo
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            {consultandoSolo ? (
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
                Consultando SoilGrids (ISRIC/Embrapa) pela coordenada central…
              </div>
            ) : (
              tipoSolo && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">
                      Tipo de solo: {tipoSolo}
                    </p>
                    <p className="text-xs text-emerald-700">
                      Preenchido automaticamente a partir das coordenadas do talhão.
                    </p>
                  </div>
                  <dl className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <dt className="text-xs text-slate-500">Argila</dt>
                      <dd className="font-semibold text-slate-800">
                        {SOLO_PREVIEW[tipoSolo].argila}%
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <dt className="text-xs text-slate-500">Areia</dt>
                      <dd className="font-semibold text-slate-800">
                        {SOLO_PREVIEW[tipoSolo].areia}%
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <dt className="text-xs text-slate-500">CAD</dt>
                      <dd className="font-semibold text-slate-800">
                        {(SOLO_PREVIEW[tipoSolo].cad * 100).toFixed(0)}%
                      </dd>
                    </div>
                  </dl>
                  <Button className="w-full" onClick={finalizarCadastro}>
                    Concluir cadastro
                  </Button>
                </div>
              )
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
