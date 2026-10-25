import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MapaTalhoes } from '../components/MapaTalhoes'
import { PainelTalhao } from '../components/PainelTalhao'
import { useAppData } from '../store/AppDataContext'

export function MapaPage() {
  const { talhoes, carregando, erro } = useAppData()
  const location = useLocation()
  const talhaoIdFocado = (location.state as { talhaoId?: string } | null)?.talhaoId

  const [talhaoSelecionadoId, setTalhaoSelecionadoId] = useState<string | undefined>(talhaoIdFocado)
  const talhaoSelecionado =
    talhoes.find((t) => t.id === talhaoSelecionadoId) ?? talhoes[0] ?? null

  if (erro) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
  }

  if (carregando && talhoes.length === 0) {
    return <p className="text-sm text-slate-400">Carregando talhões…</p>
  }

  if (!talhaoSelecionado) {
    return (
      <p className="text-sm text-slate-400">
        Nenhum talhão cadastrado ainda — cadastre um para ver o mapa.
      </p>
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

        <PainelTalhao talhao={talhaoSelecionado} />
      </div>
    </div>
  )
}
