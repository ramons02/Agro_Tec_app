import type { MedicaoTempoReal, Talhao } from '../types'

export type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA'

export interface Recomendacao {
  prioridade: Prioridade
  titulo: string
  mensagens: string[]
}

function tendenciaUmidade(talhao: Talhao): 'SUBINDO' | 'CAINDO' | 'ESTAVEL' {
  const historico = talhao.historicoUmidade
  if (historico.length < 4) return 'ESTAVEL'

  const recente = historico[historico.length - 1].umidade
  const dias3Atras = historico[historico.length - 4].umidade
  const diferenca = recente - dias3Atras

  if (diferenca > 0.015) return 'SUBINDO'
  if (diferenca < -0.015) return 'CAINDO'
  return 'ESTAVEL'
}

/**
 * Camada de sugestão sintetizando plantio (HU-10/11) + pulverização (HU-08/09) num
 * único "e agora, o que eu faço?" — NÃO é uma regra de negócio validada com a área
 * de negócio, é uma proposta feita durante a prototipação (ver HU-12).
 */
export function gerarRecomendacao(
  talhao: Talhao,
  medicao: MedicaoTempoReal | undefined,
): Recomendacao {
  const tendencia = tendenciaUmidade(talhao)
  const mensagens: string[] = []
  let prioridade: Prioridade = 'BAIXA'

  if (talhao.statusPlantio === 'VERMELHO') {
    prioridade = 'ALTA'
    mensagens.push(
      'Solo em risco crítico — evite tráfego de maquinário pesado até a umidade se recuperar.',
    )
  } else if (talhao.statusPlantio === 'AMARELO') {
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

  if (medicao) {
    if (medicao.statusPulverizacao === 'FAVORAVEL') {
      mensagens.push(
        'Janela de pulverização liberada agora — bom momento para aplicar defensivos, se necessário.',
      )
    } else if (medicao.statusPulverizacao === 'BLOQUEIO_VENTO_FORTE') {
      if (prioridade !== 'ALTA') prioridade = 'MEDIA'
      mensagens.push('Pulverização bloqueada por vento forte — aguarde a próxima checagem antes de aplicar.')
    } else {
      if (prioridade !== 'ALTA') prioridade = 'MEDIA'
      mensagens.push(
        'Pulverização bloqueada por inversão térmica — não aplique defensivos até o vento normalizar.',
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
