import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BadgeStatusPlantio } from '../components/ui/Badge'
import { FiltroDeGrupo } from '../components/FiltroDeGrupo'
import { BotaoIcone } from '../components/ui/BotaoIcone'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { CartaoDeLinha } from '../components/ui/CartaoDeLinha'
import { TODOS_OS_GRUPOS, gruposDasPropriedades, propriedadeNoGrupo } from '../lib/grupos'
import { useAppData } from '../store/AppDataContext'
import { useAuth } from '../store/AuthContext'

export function PropriedadesPage() {
  const { propriedades, talhoes, removerTalhao, removerPropriedade, carregando, erro } = useAppData()
  const { papel } = useAuth()
  const navigate = useNavigate()
  const podeEscrever = papel !== 'AGRONOMO'
  const ehMaster = papel === 'ADMIN_MASTER'
  const [busca, setBusca] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState(TODOS_OS_GRUPOS)

  function acoesDoTalhao(talhao: (typeof talhoes)[number]) {
    return (
      <>
        <BotaoIcone
          rotulo={`Visualizar ${talhao.nome} no mapa`}
          onClick={() => navigate('/mapa', { state: { talhaoId: talhao.id } })}
        >
          {ICONE_OLHO}
        </BotaoIcone>
        {podeEscrever && (
          <>
            <BotaoIcone rotulo={`Editar ${talhao.nome}`} title="Editar e reprocessar geometria" onClick={() => navigate(`/talhoes/${talhao.id}/editar`)}>
              {ICONE_LAPIS}
            </BotaoIcone>
            <BotaoIcone rotulo={`Excluir ${talhao.nome}`} perigo onClick={() => handleExcluir(talhao.id, talhao.nome)}>
              {ICONE_LIXEIRA}
            </BotaoIcone>
          </>
        )}
      </>
    )
  }

  const termoBusca = busca.trim().toLowerCase()
  const propriedadesFiltradas = propriedades.filter(
    (p) =>
      (!ehMaster || propriedadeNoGrupo(p, grupoFiltro)) &&
      (!termoBusca ||
        p.nome.toLowerCase().includes(termoBusca) ||
        (p.municipio?.toLowerCase().includes(termoBusca) ?? false)),
  )

  async function handleExcluir(talhaoId: string, nomeTalhao: string) {
    const confirmado = window.confirm(
      `Excluir "${nomeTalhao}"? Isso remove o talhão e o histórico associado a ele.`,
    )
    if (confirmado) await removerTalhao(talhaoId)
  }

  async function handleExcluirPropriedade(propriedadeId: string, nomePropriedade: string, qtdTalhoes: number) {
    const aviso =
      qtdTalhoes > 0
        ? `Excluir "${nomePropriedade}"? Isso remove a propriedade, seus ${qtdTalhoes} talhão(ões) e todo o histórico associado.`
        : `Excluir "${nomePropriedade}"?`
    if (window.confirm(aviso)) await removerPropriedade(propriedadeId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Propriedades e Talhões</h1>
          <p className="text-sm text-slate-500">
            Todas as propriedades cadastradas e os talhões dentro de cada uma.
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

      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {carregando && propriedades.length === 0 && (
        <p className="text-sm text-slate-400">Carregando propriedades…</p>
      )}
      {!carregando && !erro && propriedades.length === 0 && (
        <p className="text-sm text-slate-400">
          Nenhuma propriedade cadastrada ainda. Comece cadastrando um talhão.
        </p>
      )}

      {propriedades.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome da propriedade ou cidade…"
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          {ehMaster && (
            <FiltroDeGrupo
              grupos={gruposDasPropriedades(propriedades)}
              valor={grupoFiltro}
              aoMudar={setGrupoFiltro}
              haSemGrupo={propriedades.some((p) => !p.grupo)}
            />
          )}
        </div>
      )}

      {propriedades.length > 0 && propriedadesFiltradas.length === 0 && (
        <p className="text-sm text-slate-400">
          {termoBusca ? `Nenhuma propriedade encontrada para "${busca}".` : 'Nenhuma propriedade neste grupo.'}
        </p>
      )}

      <div className="space-y-4">
        {propriedadesFiltradas.map((propriedade) => {
          const talhoesDaPropriedade = talhoes.filter(
            (t) => t.propriedadeId === propriedade.id,
          )
          const areaTotal = talhoesDaPropriedade.reduce((soma, t) => soma + t.areaHa, 0)

          return (
            <Card key={propriedade.id}>
              <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {propriedade.nome}
                  {ehMaster && propriedade.grupo && (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {propriedade.grupo.nome}
                    </span>
                  )}
                  {propriedade.municipio && (
                    <span className="ml-2 font-normal text-slate-400">
                      {propriedade.municipio}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">
                    {talhoesDaPropriedade.length}{' '}
                    {talhoesDaPropriedade.length === 1 ? 'talhão' : 'talhões'} ·{' '}
                    {areaTotal.toFixed(1)} ha
                  </span>
                  {podeEscrever && (
                    <BotaoIcone
                      rotulo={`Excluir propriedade ${propriedade.nome}`}
                      perigo
                      onClick={() =>
                        handleExcluirPropriedade(propriedade.id, propriedade.nome, talhoesDaPropriedade.length)
                      }
                    >
                      {ICONE_LIXEIRA}
                    </BotaoIcone>
                  )}
                </div>
              </CardHeader>

              <CardBody className="p-0">
                {talhoesDaPropriedade.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-slate-400">
                    Nenhum talhão cadastrado nesta propriedade ainda.
                  </p>
                ) : (
                  <>
                    <ul className="space-y-3 p-4 md:hidden">
                      {talhoesDaPropriedade.map((talhao) => (
                        <CartaoDeLinha
                          key={talhao.id}
                          titulo={talhao.nome}
                          selo={
                            talhao.statusPlantio ? (
                              <BadgeStatusPlantio status={talhao.statusPlantio} />
                            ) : (
                              <span className="text-xs text-slate-400">Ainda sem cálculo</span>
                            )
                          }
                          campos={[
                            { rotulo: 'Área', valor: `${talhao.areaHa.toFixed(1)} ha` },
                            { rotulo: 'Solo', valor: talhao.tipoSolo ?? '-' },
                          ]}
                          acoes={<div className="flex w-full justify-end gap-1">{acoesDoTalhao(talhao)}</div>}
                        />
                      ))}
                    </ul>
                    <div className="hidden md:block">
                      <table className="w-full table-fixed text-left text-sm">
                        <colgroup>
                          <col className="w-[30%]" />
                          <col className="w-[14%]" />
                          <col className="w-[16%]" />
                          <col className="w-[22%]" />
                          <col className="w-[18%]" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                            <th className="px-5 py-2 font-medium">Talhão</th>
                            <th className="px-5 py-2 font-medium">Área</th>
                            <th className="px-5 py-2 font-medium">Solo</th>
                            <th className="px-5 py-2 font-medium">Status</th>
                            <th className="px-5 py-2 text-right font-medium">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {talhoesDaPropriedade.map((talhao) => (
                            <tr key={talhao.id} className="border-b border-slate-50 last:border-0">
                              <td className="truncate px-5 py-1 font-medium text-slate-800">{talhao.nome}</td>
                              <td className="px-5 py-1 text-slate-600">{talhao.areaHa.toFixed(1)} ha</td>
                              <td className="truncate px-5 py-1 text-slate-600">{talhao.tipoSolo ?? '-'}</td>
                              <td className="px-5 py-1">
                                {talhao.statusPlantio ? (
                                  <BadgeStatusPlantio status={talhao.statusPlantio} />
                                ) : (
                                  <span className="text-xs text-slate-400">Ainda sem cálculo</span>
                                )}
                              </td>
                              <td className="px-5 py-1">
                                <div className="flex items-center justify-end gap-1">{acoesDoTalhao(talhao)}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

const ICONE_OLHO = (
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>
)

const ICONE_LAPIS = (
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </>
)

const ICONE_LIXEIRA = (
  <>
    <path d="M3 6h18" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M10 11v6M14 11v6" />
  </>
)
