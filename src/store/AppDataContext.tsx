import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  estacoesInmet,
  medicoes as medicoesIniciais,
  propriedades as propriedadesIniciais,
  talhoes as talhoesIniciais,
} from '../mocks/data'
import { classificarPulverizacao } from '../lib/regrasPulverizacao'
import type { MedicaoTempoReal, Notificacao, Papel, Propriedade, Talhao } from '../types'

interface AppDataContextValue {
  propriedades: Propriedade[]
  talhoes: Talhao[]
  medicoes: Record<string, MedicaoTempoReal>
  notificacoes: Notificacao[]
  papel: Papel
  definirPapel: (papel: Papel) => void
  adicionarPropriedade: (propriedade: Propriedade) => void
  adicionarTalhao: (talhao: Talhao) => void
  removerTalhao: (id: string) => void
  atualizarMedicao: (codigo: string, atualizacoes: Partial<MedicaoTempoReal>) => void
  marcarNotificacoesComoLidas: () => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

type Cenario = 'FAVORAVEL' | 'VENTO_FORTE' | 'VENTO_FRACO'

const CENARIOS: Cenario[] = ['FAVORAVEL', 'VENTO_FORTE', 'VENTO_FRACO']

/**
 * Gera leituras brutas de sensor plausíveis para um cenário-alvo e deixa o status
 * ser DERIVADO pelo motor de regras real (classificarPulverizacao, seção 2 de
 * escopo/calculos-geo-metero.md) — assim o simulador exercita o mesmo código que
 * rodaria em produção, em vez de atribuir o status diretamente.
 */
function gerarMedicao(codigo: string, cenario: Cenario): MedicaoTempoReal {
  const agora = new Date().toISOString()
  let ventoVelocidadeKmh: number
  let ventoRajadaKmh: number
  let temperaturaC: number
  let precipitacaoMm: number
  let umidadePct: number

  if (cenario === 'FAVORAVEL') {
    ventoVelocidadeKmh = 3 + Math.random() * 7
    ventoRajadaKmh = Math.min(ventoVelocidadeKmh + Math.random() * 4, 14.5)
    temperaturaC = 27 + Math.random() * 4
    precipitacaoMm = Math.random() * 6
    umidadePct = 60 + Math.random() * 20
  } else if (cenario === 'VENTO_FORTE') {
    ventoVelocidadeKmh = 11 + Math.random() * 7
    ventoRajadaKmh = ventoVelocidadeKmh + 4 + Math.random() * 6
    temperaturaC = 29 + Math.random() * 4
    precipitacaoMm = Math.random() * 2
    umidadePct = 45 + Math.random() * 20
  } else {
    ventoVelocidadeKmh = 0.5 + Math.random() * 2.4
    ventoRajadaKmh = ventoVelocidadeKmh + Math.random() * 1.5
    temperaturaC = 31 + Math.random() * 5
    precipitacaoMm = Math.random() * 1
    umidadePct = 35 + Math.random() * 15
  }

  return {
    estacaoCodigo: codigo,
    dataHoraUtc: agora,
    precipitacaoMm,
    temperaturaC,
    umidadePct,
    ventoVelocidadeKmh,
    ventoRajadaKmh,
    statusPulverizacao: classificarPulverizacao(ventoVelocidadeKmh, ventoRajadaKmh),
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [propriedades, setPropriedades] = useState<Propriedade[]>(propriedadesIniciais)
  const [talhoes, setTalhoes] = useState<Talhao[]>(talhoesIniciais)
  const [medicoes, setMedicoes] = useState<Record<string, MedicaoTempoReal>>(medicoesIniciais)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [papel, setPapel] = useState<Papel>('PRODUTOR_RURAL')

  const medicoesRef = useRef(medicoes)
  medicoesRef.current = medicoes

  useEffect(() => {
    // Simula o motor de regras reagindo em tempo real (HU-08/HU-09): de tempos em
    // tempos, uma estação muda de status e dispara uma notificação — só pra dar
    // vida ao conceito de "alerta instantâneo" da Constituição do projeto.
    const intervalo = setInterval(() => {
      if (Math.random() < 0.45) return

      const estacao = estacoesInmet[Math.floor(Math.random() * estacoesInmet.length)]
      const statusAnterior = medicoesRef.current[estacao.codigo]?.statusPulverizacao
      const cenario = CENARIOS[Math.floor(Math.random() * CENARIOS.length)]
      const novaMedicao = gerarMedicao(estacao.codigo, cenario)
      const statusNovo = novaMedicao.statusPulverizacao

      setMedicoes((atual) => ({ ...atual, [estacao.codigo]: novaMedicao }))

      if (statusAnterior && statusAnterior !== statusNovo) {
        setNotificacoes((atual) =>
          [
            {
              id: `notif-${Date.now()}`,
              estacaoCodigo: estacao.codigo,
              estacaoNome: estacao.nome,
              statusAnterior,
              statusNovo,
              criadoEm: new Date().toISOString(),
              lida: false,
            },
            ...atual,
          ].slice(0, 20),
        )
      }
    }, 16000)

    return () => clearInterval(intervalo)
  }, [])

  const value = useMemo<AppDataContextValue>(
    () => ({
      propriedades,
      talhoes,
      medicoes,
      notificacoes,
      papel,
      definirPapel: setPapel,
      adicionarPropriedade: (propriedade) =>
        setPropriedades((atual) => [...atual, propriedade]),
      adicionarTalhao: (talhao) => setTalhoes((atual) => [...atual, talhao]),
      removerTalhao: (id) => setTalhoes((atual) => atual.filter((t) => t.id !== id)),
      atualizarMedicao: (codigo, atualizacoes) =>
        setMedicoes((atual) => ({
          ...atual,
          [codigo]: { ...atual[codigo], ...atualizacoes },
        })),
      marcarNotificacoesComoLidas: () =>
        setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true }))),
    }),
    [propriedades, talhoes, medicoes, notificacoes, papel],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const contexto = useContext(AppDataContext)
  if (!contexto) throw new Error('useAppData precisa estar dentro de <AppDataProvider>')
  return contexto
}
