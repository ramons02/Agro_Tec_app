import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiltroDeGrupo } from '../components/FiltroDeGrupo'
import { MapaTalhoes } from '../components/MapaTalhoes'
import { PainelTalhao } from '../components/PainelTalhao'
import { gruposDasPropriedades, propriedadeNoGrupo, TODOS_OS_GRUPOS } from '../lib/grupos'
import { ehMaster } from '../lib/papeis'
import { useAppData } from '../store/AppDataContext'
import { useAuth } from '../store/AuthContext'

export function MapaPage() {
  const { talhoes: todosOsTalhoes, propriedades, carregando, erro } = useAppData()
  const { papel } = useAuth()
  const master = ehMaster(papel)
  const location = useLocation()
  const talhaoIdFocado = (location.state as { talhaoId?: string } | null)?.talhaoId

  const [talhaoSelecionadoId, setTalhaoSelecionadoId] = useState<string | undefined>(talhaoIdFocado)
  // O Master enxerga todos os grupos juntos: o filtro deixa ver um cliente por vez (só ele recebe esse controle).
  const [grupoFiltro, setGrupoFiltro] = useState(TODOS_OS_GRUPOS)
  const grupos = useMemo(() => gruposDasPropriedades(propriedades), [propriedades])
  const propriedadePorId = useMemo(() => new Map(propriedades.map((p) => [p.id, p])), [propriedades])
  const talhoes = master
    ? todosOsTalhoes.filter((t) => propriedadeNoGrupo(propriedadePorId.get(t.propriedadeId), grupoFiltro))
    : todosOsTalhoes
  const talhaoSelecionado =
    talhoes.find((t) => t.id === talhaoSelecionadoId) ?? talhoes[0] ?? null
  const haSemGrupo = propriedades.some((p) => !p.grupo)
  const filtro =
    master && (grupos.length > 1 || (grupos.length > 0 && haSemGrupo)) ? (
      <FiltroDeGrupo grupos={grupos} valor={grupoFiltro} aoMudar={setGrupoFiltro} haSemGrupo={haSemGrupo} />
    ) : null

  if (erro) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
  }

  if (carregando && todosOsTalhoes.length === 0) {
    return <p className="text-sm text-slate-400">Carregando talhões…</p>
  }

  if (!talhaoSelecionado) {
    return (
      <div className="space-y-3">
        {filtro}
        <p className="text-sm text-slate-400">
          {todosOsTalhoes.length > 0
            ? 'Nenhum talhão neste grupo.'
            : 'Nenhum talhão cadastrado ainda. Cadastre um para ver o mapa.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:h-full">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Mapa de Talhões</h1>
        <p className="text-sm text-slate-500">
          Visualize os seus talhões. Clique num talhão para ver o clima, o balanço hídrico e
          a janela de pulverização.
        </p>
        {filtro && <div className="mt-3">{filtro}</div>}
      </div>

      {/* Abaixo de 1024 px o painel fica embaixo do mapa e a página rola; a partir de 1024 px, ao lado, como antes. */}
      <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_320px]">
        <div className="h-[60dvh] min-h-[18rem] overflow-hidden rounded-xl border border-slate-200 shadow-sm lg:h-auto">
          <MapaTalhoes
            talhoes={talhoes}
            onSelecionarTalhao={(talhao) => setTalhaoSelecionadoId(talhao.id)}
            talhaoFoco={talhaoSelecionado}
          />
        </div>

        <PainelTalhao
          talhao={talhaoSelecionado}
          grupo={master ? (propriedadePorId.get(talhaoSelecionado.propriedadeId)?.grupo?.nome ?? null) : undefined}
        />
      </div>
    </div>
  )
}
