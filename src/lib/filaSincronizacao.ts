/**
 * Fila de ações offline (HU-16, US2 — spec 016). Uma ação de escrita que falha por falta
 * de rede (não por erro do servidor) é enfileirada em IndexedDB e reenviada ao reconectar
 * (evento `online`), removida da fila só após confirmação de sucesso — nunca duplica
 * (research.md: reenviar até confirmação é o padrão mínimo de sincronização confiável).
 */
import { apiDelete, apiPost, apiPut } from './apiClient'
import {
  enfileirarAcaoPendente,
  incrementarTentativa,
  listarAcoesPendentes,
  removerAcaoPendente,
  type AcaoPendente,
} from './indexedDb'

const LIMITE_TENTATIVAS = 5

type Ouvinte = () => void
const ouvintes = new Set<Ouvinte>()
const ouvintesSincronizacao = new Set<Ouvinte>()

/** Componentes (ex: badge de estado da AppShell) assinam pra saber quando a fila muda. */
export function aoMudarFila(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

/** Disparado quando uma ação enfileirada é sincronizada com sucesso -- quem criou um
 * registro local otimista (ex: `criarTalhao` offline) usa isso pra recarregar do servidor
 * e trocar o placeholder pelo dado real, sem precisar reconciliar id local x id do servidor
 * aqui dentro. */
export function aoSincronizarComSucesso(ouvinte: Ouvinte): () => void {
  ouvintesSincronizacao.add(ouvinte)
  return () => ouvintesSincronizacao.delete(ouvinte)
}

function notificar() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

function notificarSincronizacao() {
  ouvintesSincronizacao.forEach((ouvinte) => ouvinte())
}

/** `fetch` rejeita com TypeError quando não há rede nenhuma -- ApiError só existe quando
 * o servidor respondeu de verdade (mesmo que com um erro HTTP, ex: 422/500). Só o
 * primeiro caso deve virar item de fila; um erro de negócio real não deve ser reenviado
 * silenciosamente pra sempre. */
function erroDeRede(erro: unknown): boolean {
  return erro instanceof TypeError
}

/** Chama a API normalmente; se falhar por falta de rede, enfileira em vez de propagar o
 * erro. Devolve `null` quando a ação foi enfileirada (sem resposta do servidor ainda). */
export async function executarOuEnfileirar<T>(
  metodo: AcaoPendente['metodo'],
  caminho: string,
  corpo: unknown | null,
  chamar: () => Promise<T>,
): Promise<T | null> {
  try {
    return await chamar()
  } catch (erro) {
    if (!erroDeRede(erro)) throw erro
    await enfileirarAcaoPendente({ metodo, caminho, corpo })
    notificar()
    return null
  }
}

async function executarAcao(acao: AcaoPendente): Promise<void> {
  if (acao.metodo === 'POST') await apiPost(acao.caminho, acao.corpo ?? undefined)
  else if (acao.metodo === 'PUT') await apiPut(acao.caminho, acao.corpo)
  else await apiDelete(acao.caminho)
}

export async function processarFila(): Promise<void> {
  const acoes = await listarAcoesPendentes()
  for (const acao of acoes) {
    try {
      await executarAcao(acao)
      await removerAcaoPendente(acao.idLocal)
      notificar()
      notificarSincronizacao()
    } catch (erro) {
      if (erroDeRede(erro)) return // ainda sem rede de verdade -- tenta de novo na próxima reconexão
      if (acao.tentativas + 1 >= LIMITE_TENTATIVAS) {
        // Erro persistente do servidor (não de rede) -- desiste pra não tentar pra sempre.
        await removerAcaoPendente(acao.idLocal)
      } else {
        await incrementarTentativa(acao)
      }
      notificar()
    }
  }
}

let escutandoOnline = false

/** Chamar uma vez na inicialização do app (ex: `AppShell`). */
export function iniciarSincronizacaoAutomatica(): void {
  if (escutandoOnline || typeof window === 'undefined') return
  escutandoOnline = true
  window.addEventListener('online', () => void processarFila())
  if (navigator.onLine) void processarFila()
}

export async function contarAcoesPendentes(): Promise<number> {
  return (await listarAcoesPendentes()).length
}
