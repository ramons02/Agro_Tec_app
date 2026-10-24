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
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Mapa de Talhões</h1>
        <p className="text-sm text-slate-500">
          Visualize os seus talhões. Clique num talhão para ver o clima, o balanço hídrico e
          a janela de pulverização.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px] gap-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
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
