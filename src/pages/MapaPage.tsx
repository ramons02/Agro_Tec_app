import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MapaTalhoes } from '../components/MapaTalhoes'
import { PainelTalhao } from '../components/PainelTalhao'
import { estacoesInmet } from '../mocks/data'
import { useAppData } from '../store/AppDataContext'

export function MapaPage() {
  const { talhoes, medicoes } = useAppData()
  const location = useLocation()
  const talhaoIdFocado = (location.state as { talhaoId?: string } | null)?.talhaoId

  const [talhaoSelecionadoId, setTalhaoSelecionadoId] = useState<string>(
    talhaoIdFocado ?? talhoes[0].id,
  )
  const talhaoSelecionado = talhoes.find((t) => t.id === talhaoSelecionadoId) ?? talhoes[0]

  const estacao = estacoesInmet.find(
    (e) => e.codigo === talhaoSelecionado.estacaoMaisProximaCodigo,
  )
  const medicao = medicoes[talhaoSelecionado.estacaoMaisProximaCodigo]

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Mapa de Talhões</h1>
        <p className="text-sm text-slate-500">
          Visualize propriedades, talhões e estações do INMET mais próximas. Clique em um
          talhão ou marcador para ver detalhes.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px] gap-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <MapaTalhoes
            talhoes={talhoes}
            estacoes={estacoesInmet}
            medicoes={medicoes}
            onSelecionarTalhao={(talhao) => setTalhaoSelecionadoId(talhao.id)}
            talhaoFoco={talhaoSelecionado}
          />
        </div>

        <PainelTalhao talhao={talhaoSelecionado} estacao={estacao} medicao={medicao} />
      </div>
    </div>
  )
}
