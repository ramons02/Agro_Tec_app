import { apiGet, apiPost, obterToken } from './apiClient'

export type EstadoAvisos = 'nao-suportado' | 'precisa-instalar' | 'bloqueado' | 'inativo' | 'ativo'

function suportaPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function ehIphone(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function instaladoNaTelaInicial(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** O service worker só existe no app publicado (não no servidor de desenvolvimento). */
async function registroDoServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined
  return navigator.serviceWorker.getRegistration()
}

export async function estadoDosAvisos(): Promise<EstadoAvisos> {
  if (!suportaPush()) return ehIphone() && !instaladoNaTelaInicial() ? 'precisa-instalar' : 'nao-suportado'
  if (Notification.permission === 'denied') return 'bloqueado'
  const registro = await registroDoServiceWorker()
  if (!registro) return 'nao-suportado'
  return (await registro.pushManager.getSubscription()) ? 'ativo' : 'inativo'
}

/** A chave pública vem em base64 "url safe"; o navegador pede os bytes. */
function chaveParaBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const texto = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(texto.length))
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i)
  return bytes
}

/** Pede permissão, cria a assinatura neste aparelho e a registra na API. Lança erro com texto para a pessoa. */
export async function ativarAvisos(): Promise<void> {
  const registro = await registroDoServiceWorker()
  if (!suportaPush() || !registro) throw new Error('Este aparelho ou navegador não recebe notificações do app.')

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') throw new Error('Sem a permissão, não dá para avisar. Libere as notificações do site no navegador.')

  const { chave_publica } = await apiGet<{ chave_publica: string }>('/api/v1/push/chave')
  const assinatura =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave_publica) }))
  await apiPost('/api/v1/push/assinaturas', assinatura.toJSON())
}

export async function desativarAvisos(): Promise<void> {
  const registro = await registroDoServiceWorker()
  const assinatura = await registro?.pushManager.getSubscription()
  if (!assinatura) return
  await apiPost('/api/v1/push/assinaturas/remover', { endpoint: assinatura.endpoint })
  await assinatura.unsubscribe()
}

/**
 * Ao sair da conta, o aparelho para de receber os avisos dela (pode ser um aparelho compartilhado). Usa o token
 * que estava na sessão no instante da saída, porque a chamada termina depois de a sessão ser apagada.
 */
export async function desligarAvisosAoSair(): Promise<void> {
  try {
    const token = obterToken()
    const registro = await registroDoServiceWorker()
    const assinatura = await registro?.pushManager.getSubscription()
    if (!assinatura) return
    await assinatura.unsubscribe()
    if (token) await apiPost('/api/v1/push/assinaturas/remover', { endpoint: assinatura.endpoint }, token)
  } catch {
    // Sem rede ou sem suporte: a assinatura some do servidor quando o aparelho for reaproveitado por outra conta.
  }
}
