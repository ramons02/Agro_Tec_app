import type { PontoHistoricoUmidade, PulverizacaoResultado, StatusPlantio } from '../types'

export type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA'

export interface Recomendacao {
  prioridade: Prioridade
  titulo: string
  mensagens: string[]
}

function tendenciaUmidade(historico: PontoHistoricoUmidade[]): 'SUBINDO' | 'CAINDO' | 'ESTAVEL' {
  if (historico.length < 4) return 'ESTAVEL'

  const recente = historico[historico.length - 1].umidade
  const dias3Atras = historico[historico.length - 4].umidade
  const diferenca = recente - dias3Atras

  if (diferenca > 0.015) return 'SUBINDO'
  if (diferenca < -0.015) return 'CAINDO'
  return 'ESTAVEL'
}

const MENSAGEM_BLOQUEIO_PULVERIZACAO: Record<string, string> = {
  BLOQUEIO_VENTO_FORTE: 'Pulverização bloqueada por vento forte — aguarde a próxima checagem antes de aplicar.',
  BLOQUEIO_INVERSAO_TERMICA:
    'Pulverização bloqueada por inversão térmica — não aplique defensivos até a condição normalizar.',
  BLOQUEIO_EVAPORACAO_EXCESSIVA:
    'Pulverização bloqueada por evaporação excessiva (Delta T alto) — a calda pode não atingir o alvo.',
}

/**
 * Camada de sugestão sintetizando plantio (HU-10/11) + pulverização (HU-08/09) num
 * único "e agora, o que eu faço?" — feature 012 (Recomendação) ainda não existe na
 * API; `historicoUmidade` aqui vem do enriquecimento simulado
 * (`lib/enriquecimentoSimulado.ts`), não é dado real.
 */
export function gerarRecomendacao(
  statusPlantio: StatusPlantio | null,
  historicoUmidade: PontoHistoricoUmidade[],
  pulverizacao: PulverizacaoResultado | null,
): Recomendacao {
  const tendencia = tendenciaUmidade(historicoUmidade)
  const mensagens: string[] = []
  let prioridade: Prioridade = 'BAIXA'

  if (statusPlantio === null) {
    mensagens.push('Ainda sem balanço hídrico calculado para este talhão.')
  } else if (statusPlantio === 'VERMELHO') {
    prioridade = 'ALTA'
    mensagens.push(
      'Solo em risco crítico — evite tráfego de maquinário pesado até a umidade se recuperar.',
    )
  } else if (statusPlantio === 'AMARELO') {
    prioridade = 'MEDIA'
    if (tendencia === 'CAINDO') {
      mensagens.push(
        'Umidade em queda nos últimos dias — monitore de perto, a janela de plantio pode fechar em breve.',
      )
    } else if (tendencia === 'SUBINDO') {
      mensagens.push(
        'Umidade em recuperação — se a tendência continuar, a janela de plantio deve abrir em poucos dias.',
      )
    } else {
      mensagens.push('Umidade estável, mas ainda no limite — vale reavaliar antes de decidir o plantio.')
    }
  } else {
    mensagens.push('Solo em condição ideal para plantio — sem restrições hídricas no momento.')
  }

  if (pulverizacao) {
    if (pulverizacao.classificacao === 'FAVORAVEL') {
      mensagens.push(
        'Janela de pulverização liberada agora — bom momento para aplicar defensivos, se necessário.',
      )
    } else {
      if (prioridade !== 'ALTA') prioridade = 'MEDIA'
      mensagens.push(
        MENSAGEM_BLOQUEIO_PULVERIZACAO[pulverizacao.classificacao] ??
          'Pulverização bloqueada no momento — aguarde a próxima checagem.',
      )
    }
  }

  const titulo =
    prioridade === 'ALTA'
      ? 'Ação necessária'
      : prioridade === 'MEDIA'
        ? 'Atenção recomendada'
        : 'Tudo certo por aqui'

  return { prioridade, titulo, mensagens }
}
