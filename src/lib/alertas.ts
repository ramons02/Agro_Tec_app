import { apiGet, apiPost } from './apiClient'

export type TipoAlerta = 'JANELA_FAVORAVEL' | 'RAJADA_FORTE'

export interface Alerta {
  id: string
  tipo: TipoAlerta
  mensagem: string
  talhaoId: string
  criadoEm: string
  lido: boolean
}

export interface ListaDeAlertas {
  naoLidos: number
  itens: Alerta[]
}

interface ListaApi {
  nao_lidos: number
  itens: Array<{ id: string; tipo: TipoAlerta; mensagem: string; talhao_id: string; criado_em: string; lido: boolean }>
}

/** Alertas da pessoa logada: os 50 mais recentes e quantos ainda não foram lidos. */
export async function listarAlertas(): Promise<ListaDeAlertas> {
  const r = await apiGet<ListaApi>('/api/v1/alertas')
  return {
    naoLidos: r.nao_lidos,
    itens: r.itens.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      mensagem: a.mensagem,
      talhaoId: a.talhao_id,
      criadoEm: a.criado_em,
      lido: a.lido,
    })),
  }
}

export async function marcarAlertaLido(id: string): Promise<void> {
  await apiPost(`/api/v1/alertas/${id}/lido`)
}

export async function marcarTodosLidos(): Promise<void> {
  await apiPost('/api/v1/alertas/lidos')
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias". */
export function tempoDecorrido(iso: string, agora = Date.now()): string {
  const minutos = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000))
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.floor(horas / 24)
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}
