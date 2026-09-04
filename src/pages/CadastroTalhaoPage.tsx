import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { MapaDesenhoTalhao } from '../components/MapaDesenhoTalhao'
import { ApiError } from '../lib/apiClient'
import { pontosLeafletParaPolygon } from '../lib/geo'
import { MUNICIPIOS_PARA } from '../lib/municipiosPara'
import { useAppData } from '../store/AppDataContext'
import type { Talhao } from '../types'

type Etapa = 'DADOS' | 'GEOMETRIA' | 'ENVIANDO'

const NOVA_PROPRIEDADE = '__NOVA__'
const CENTRO_PADRAO: [number, number] = [-1.295, -47.955]

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
  const { propriedades, talhoes, criarPropriedade, criarTalhao } = useAppData()

  const [etapa, setEtapa] = useState<Etapa>('DADOS')
  const [nome, setNome] = useState('')
  const [propriedadeId, setPropriedadeId] = useState<string>(propriedades[0]?.id ?? NOVA_PROPRIEDADE)
  const [buscaPropriedade, setBuscaPropriedade] = useState('')
  const [novaPropriedadeNome, setNovaPropriedadeNome] = useState('')
  const [novaPropriedadeMunicipio, setNovaPropriedadeMunicipio] = useState('')
  const [pontos, setPontos] = useState<[number, number][]>([])
  const [focoVersaoImportacao, setFocoVersaoImportacao] = useState(0)
  const [erroImportacao, setErroImportacao] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [talhaoCriado, setTalhaoCriado] = useState<Talhao | null>(null)
  const [enviando, setEnviando] = useState(false)

  const inputArquivoRef = useRef<HTMLInputElement>(null)

  const criandoNovaPropriedade = propriedadeId === NOVA_PROPRIEDADE

  const termoBusca = buscaPropriedade.trim().toLowerCase()
  const propriedadesFiltradas = termoBusca
    ? propriedades.filter(
        (p) =>
          p.nome.toLowerCase().includes(termoBusca) ||
          (p.municipio?.toLowerCase().includes(termoBusca) ?? false),
      )
    : propriedades

  /** Prioriza o centro real do talhão já existente; sem talhão ainda, cai para o
   * centro do município escolhido no cadastro — assim o mapa já abre localizado na
   * cidade certa em vez de sempre no mesmo ponto padrão do estado inteiro. */
  function centroEZoomDaPropriedade(id: string): { centro: [number, number]; zoom: number } {
    const centroTalhaoExistente = talhoes.find((t) => t.propriedadeId === id)?.centro
    if (centroTalhaoExistente) return { centro: centroTalhaoExistente, zoom: 16 }

    const nomeMunicipio =
      id === NOVA_PROPRIEDADE
        ? novaPropriedadeMunicipio
        : propriedades.find((p) => p.id === id)?.municipio
    const municipio = nomeMunicipio
      ? MUNICIPIOS_PARA.find((m) => m.nome === nomeMunicipio)
      : undefined
    if (municipio) return { centro: [municipio.lat, municipio.lng], zoom: 12 }

    return { centro: CENTRO_PADRAO, zoom: 16 }
  }

  async function irParaGeometria(event: FormEvent) {
    event.preventDefault()
    setErroEnvio(null)

    if (criandoNovaPropriedade) {
      try {
        const propriedade = await criarPropriedade(novaPropriedadeNome, novaPropriedadeMunicipio)
        setPropriedadeId(propriedade.id)
      } catch (excecao) {
        setErroEnvio(excecao instanceof ApiError ? excecao.message : 'Falha ao criar a propriedade.')
        return
      }
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

  /** Sobreposição, "fora do Pará" e parametrização de solo são todas validadas e
   * calculadas no servidor (RN015/RN016, feature 004/005) — o cliente só desenha
   * e envia a geometria, nunca recalcula essas regras localmente. */
  async function enviarTalhao(confirmarForaDoPara: boolean) {
    setEnviando(true)
    setErroEnvio(null)
    setEtapa('ENVIANDO')
    try {
      const talhao = await criarTalhao({
        propriedadeId,
        nome,
        geometria: pontosLeafletParaPolygon(pontos),
        confirmarForaDoPara,
      })
      setTalhaoCriado(talhao)
    } catch (excecao) {
      if (excecao instanceof ApiError && excecao.codigo === 422) {
        const detalhes = excecao.detalhes as { tipo?: string } | null
        if (detalhes?.tipo === 'FORA_DO_PARA') {
          const confirmado = window.confirm(
            'Esse talhão parece estar fora do estado do Pará. Confirma o cadastro mesmo assim?',
          )
          if (confirmado) {
            await enviarTalhao(true)
            return
          }
        }
      }
      setErroEnvio(excecao instanceof ApiError ? excecao.message : 'Falha ao cadastrar o talhão.')
      setEtapa('GEOMETRIA')
    } finally {
      setEnviando(false)
    }
  }

  function finalizarCadastro() {
    if (talhaoCriado) navigate('/mapa', { state: { talhaoId: talhaoCriado.id } })
  }

  const ETAPAS: Array<{ id: Etapa; label: string }> = [
    { id: 'DADOS', label: '1. Dados básicos' },
    { id: 'GEOMETRIA', label: '2. Geometria' },
    { id: 'ENVIANDO', label: '3. Solo (automático)' },
  ]

  return (
    <div className={`mx-auto space-y-6 ${etapa === 'GEOMETRIA' ? 'max-w-4xl' : 'max-w-2xl'}`}>
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
                  Buscar propriedade por nome ou cidade
                </label>
                <input
                  value={buscaPropriedade}
                  onChange={(e) => setBuscaPropriedade(e.target.value)}
                  placeholder="Ex: Rio Maria"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Propriedade
                </label>
                <select
                  value={propriedadeId}
                  onChange={(e) => setPropriedadeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {propriedadesFiltradas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.municipio ? `${p.nome} — ${p.municipio}` : p.nome}
                    </option>
                  ))}
                  <option value={NOVA_PROPRIEDADE}>+ Cadastrar nova propriedade</option>
                </select>
                {termoBusca && propriedadesFiltradas.length === 0 && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Nenhuma propriedade encontrada para "{buscaPropriedade}".
                  </p>
                )}
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
                      Cidade
                    </label>
                    <select
                      required
                      value={novaPropriedadeMunicipio}
                      onChange={(e) => setNovaPropriedadeMunicipio(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="" disabled>
                        Selecione a cidade
                      </option>
                      {MUNICIPIOS_PARA.map((m) => (
                        <option key={m.nome} value={m.nome}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-slate-400">
                      O mapa da próxima etapa já abre localizado nessa cidade.
                    </p>
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

              {erroEnvio && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {erroEnvio}
                </p>
              )}

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

            <div className="h-[32rem] overflow-hidden rounded-lg border border-slate-200">
              <MapaDesenhoTalhao
                center={centroEZoomDaPropriedade(propriedadeId).centro}
                zoom={centroEZoomDaPropriedade(propriedadeId).zoom}
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

            {(erroImportacao || erroEnvio) && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {erroImportacao ?? erroEnvio}
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
                disabled={pontos.length < 3 || enviando}
                onClick={() => void enviarTalhao(false)}
              >
                Confirmar geometria
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {etapa === 'ENVIANDO' && (
        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-slate-900">
              Parametrização automática de solo
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            {enviando || !talhaoCriado ? (
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
                Cadastrando talhão e consultando SoilGrids (ISRIC) pela coordenada central…
              </div>
            ) : (
              <div className="space-y-3">
                {talhaoCriado.tipoSolo ? (
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">
                      Tipo de solo: {talhaoCriado.tipoSolo}
                    </p>
                    <p className="text-xs text-emerald-700">
                      Preenchido automaticamente a partir das coordenadas do talhão.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">
                      Solo não parametrizado automaticamente
                    </p>
                    <p className="text-xs text-amber-700">
                      A fonte de dados de solo (SoilGrids) não respondeu para essa coordenada —
                      o talhão foi cadastrado mesmo assim, sem bloqueio (FR-006).
                    </p>
                  </div>
                )}
                <dl className="grid grid-cols-2 gap-3 text-center text-sm">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <dt className="text-xs text-slate-500">Área calculada</dt>
                    <dd className="font-semibold text-slate-800">{talhaoCriado.areaHa.toFixed(2)} ha</dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <dt className="text-xs text-slate-500">CAD</dt>
                    <dd className="font-semibold text-slate-800">
                      {talhaoCriado.capacidadeAguaDisponivelMm !== null
                        ? `${talhaoCriado.capacidadeAguaDisponivelMm.toFixed(1)} mm`
                        : '—'}
                    </dd>
                  </div>
                </dl>
                <Button className="w-full" onClick={finalizarCadastro}>
                  Concluir cadastro
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
