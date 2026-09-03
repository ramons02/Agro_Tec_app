import { Link } from 'react-router-dom'
import { BadgeStatusPlantio } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { useAppData } from '../store/AppDataContext'

export function PropriedadesPage() {
  const { propriedades, talhoes, removerTalhao, papel } = useAppData()
  const podeEscrever = papel !== 'AGRONOMO'

  function handleExcluir(talhaoId: string, nomeTalhao: string) {
    const confirmado = window.confirm(
      `Excluir "${nomeTalhao}"? Isso remove o talhão e o histórico associado a ele.`,
    )
    if (confirmado) removerTalhao(talhaoId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Propriedades e Talhões</h1>
          <p className="text-sm text-slate-500">
            Gestão territorial (HU-05): todas as propriedades cadastradas e os talhões
            dentro de cada uma.
          </p>
        </div>
        {podeEscrever && (
          <Link
            to="/talhoes/novo"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Cadastrar talhão
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {propriedades.map((propriedade) => {
          const talhoesDaPropriedade = talhoes.filter(
            (t) => t.propriedadeId === propriedade.id,
          )
          const areaTotal = talhoesDaPropriedade.reduce((soma, t) => soma + t.areaHa, 0)

          return (
            <Card key={propriedade.id}>
              <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{propriedade.nome}</p>
                  <p className="text-xs text-slate-500">
                    {propriedade.proprietario} · {propriedade.municipio}
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {talhoesDaPropriedade.length}{' '}
                  {talhoesDaPropriedade.length === 1 ? 'talhão' : 'talhões'} ·{' '}
                  {areaTotal.toFixed(1)} ha
                </span>
              </CardHeader>

              <CardBody className="p-0">
                {talhoesDaPropriedade.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-slate-400">
                    Nenhum talhão cadastrado nesta propriedade ainda.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                          <th className="px-5 py-2 font-medium">Talhão</th>
                          <th className="px-5 py-2 font-medium">Área</th>
                          <th className="px-5 py-2 font-medium">Solo</th>
                          <th className="px-5 py-2 font-medium">Status</th>
                          <th className="px-5 py-2 font-medium">Estação</th>
                          {podeEscrever && (
                            <th className="px-5 py-2 font-medium text-right">Ação</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {talhoesDaPropriedade.map((talhao) => (
                          <tr key={talhao.id} className="border-b border-slate-50 last:border-0">
                            <td className="px-5 py-3 font-medium text-slate-800">
                              {talhao.nome}
                            </td>
                            <td className="px-5 py-3 text-slate-600">{talhao.areaHa} ha</td>
                            <td className="px-5 py-3 text-slate-600">{talhao.tipoSolo}</td>
                            <td className="px-5 py-3">
                              <BadgeStatusPlantio status={talhao.statusPlantio} />
                            </td>
                            <td className="px-5 py-3 text-slate-600">
                              {talhao.estacaoMaisProximaCodigo}
                            </td>
                            {podeEscrever && (
                              <td className="px-5 py-3 text-right">
                                <button
                                  onClick={() => handleExcluir(talhao.id, talhao.nome)}
                                  className="text-xs font-medium text-red-600 hover:text-red-800"
                                >
                                  Excluir
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
