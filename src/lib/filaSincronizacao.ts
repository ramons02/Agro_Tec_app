/**
 * Fila de ações offline (HU-16, US2 — spec 016). Uma ação de escrita que falha por falta
 * de rede (não por erro do servidor) é enfileirada em IndexedDB e reenviada ao reconectar
 * (evento `online`), removida da fila só após confirmação de sucesso — nunca duplica
 * (research.md: reenviar até confirmação é o padrão mínimo de sincronização confiável).
 */
import { ApiError, apiDelete, apiPost, apiPut } from './apiClient'
import {
  enfileirarAcaoPendente,
  incrementarTentativa,
  listarAcoesPendentes,
  listarAcoesRecusadas,
  removerAcaoPendente,
  salvarAcaoPendente,
  type AcaoPendente,
} from './indexedDb'
import { usuarioAtualId } from './sessao'

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
  /** Id provisório do registro que a ação cria, para trocar pelo id real nas ações seguintes da fila. */
  refLocal?: string,
): Promise<T | null> {
  try {
    return await chamar()
  } catch (erro) {
    if (!erroDeRede(erro)) throw erro
    const usuarioId = usuarioAtualId()
    if (!usuarioId) throw erro // sem sessão não há de quem guardar a ação
    await enfileirarAcaoPendente({ metodo, caminho, corpo, refLocal }, usuarioId)
    notificar()
    return null
  }
}

async function executarAcao(acao: AcaoPendente): Promise<unknown> {
  if (acao.metodo === 'POST') return apiPost(acao.caminho, acao.corpo ?? undefined)
  if (acao.metodo === 'PUT') return apiPut(acao.caminho, acao.corpo)
  return apiDelete(acao.caminho)
}

/** Troca `antigo` por `novo` em todo texto do corpo (propriedade_id, por exemplo) e no caminho. */
function trocarReferencia<T>(valor: T, antigo: string, novo: string): T {
  if (typeof valor === 'string') return (valor === antigo ? novo : valor.split(antigo).join(novo)) as T
  if (Array.isArray(valor)) return valor.map((v) => trocarReferencia(v, antigo, novo)) as T
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, trocarReferencia(v, antigo, novo)])) as T
  }
  return valor
}

/** Uma propriedade ou talhão criado offline ganhou id real: as ações seguintes da fila que o citam passam a usar o id real. */
async function propagarIdReal(acao: AcaoPendente, resposta: unknown, restantes: AcaoPendente[]) {
  const idReal = (resposta as { id?: unknown } | null)?.id
  if (!acao.refLocal || typeof idReal !== 'string') return
  for (const outra of restantes) {
    if (outra.idLocal === acao.idLocal) continue
    await salvarAcaoPendente({
      ...outra,
      caminho: trocarReferencia(outra.caminho, acao.refLocal, idReal),
      corpo: trocarReferencia(outra.corpo, acao.refLocal, idReal),
    })
  }
}

/** Erro 4xx (exceto 408/429) é recusa por regra de negócio: reenviar não adianta, a pessoa precisa corrigir. */
function recusaDefinitiva(erro: ApiError): boolean {
  return erro.codigo >= 400 && erro.codigo < 500 && erro.codigo !== 408 && erro.codigo !== 429
}

async function marcarRecusada(acao: AcaoPendente, motivo: string) {
  await salvarAcaoPendente({ ...acao, recusadaEm: new Date().toISOString(), motivoRecusa: motivo })
}

let processando = false

export async function processarFila(): Promise<void> {
  if (processando) return
  processando = true
  try {
    let acoes = await listarAcoesPendentes(usuarioAtualId())
    while (acoes.length > 0) {
      const acao = acoes[0]
      try {
        const resposta = await executarAcao(acao)
        await removerAcaoPendente(acao.idLocal)
        await propagarIdReal(acao, resposta, acoes.slice(1))
        notificar()
        notificarSincronizacao()
      } catch (erro) {
        if (erroDeRede(erro)) return // ainda sem rede de verdade -- tenta de novo na próxima reconexão
        const mensagem = erro instanceof ApiError ? erro.message : 'Erro inesperado ao sincronizar.'
        if ((erro instanceof ApiError && recusaDefinitiva(erro)) || acao.tentativas + 1 >= LIMITE_TENTATIVAS) {
          // Não some em silêncio: a ação fica guardada como recusada, com o motivo, para a pessoa ver.
          await marcarRecusada(acao, mensagem)
          notificar()
          notificarSincronizacao() // recarrega do servidor e tira o registro provisório da tela
        } else {
          await incrementarTentativa(acao)
          notificar()
          return // erro do servidor: tenta de novo na próxima reconexão, sem martelar a API
        }
      }
      acoes = await listarAcoesPendentes(usuarioAtualId())
    }
  } finally {
    processando = false
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

export async function acoesRecusadas(): Promise<AcaoPendente[]> {
  return listarAcoesRecusadas(usuarioAtualId())
}

/** A pessoa viu o motivo: tira a ação recusada da lista. */
export async function dispensarAcaoRecusada(idLocal: string): Promise<void> {
  await removerAcaoPendente(idLocal)
  notificar()
}

export async function contarAcoesPendentes(): Promise<number> {
  return (await listarAcoesPendentes(usuarioAtualId())).length
}
