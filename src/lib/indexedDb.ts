/**
 * Armazenamento local pra navegação offline (HU-16, spec 016). Duas object stores
 * (data-model.md): CacheDados (última resposta boa de cada recurso) e AcaoPendente (fila de
 * escritas feitas offline, sincronizadas ao reconectar). API nativa do navegador — sem
 * wrapper (Dexie etc.), volume de dados não justifica a dependência extra (research.md).
 */

const NOME_BANCO = 'agroclima-offline'
const VERSAO_BANCO = 1
const STORE_CACHE = 'cacheDados'
const STORE_ACOES = 'acoesPendentes'

export interface CacheDados<T = unknown> {
  chave: string
  dados: T
  sincronizadoEm: string
}

export interface AcaoPendente {
  idLocal: string
  metodo: 'POST' | 'PUT' | 'DELETE'
  caminho: string
  corpo: unknown | null
  criadoEm: string
  tentativas: number
}

let bancoPromise: Promise<IDBDatabase> | null = null

function abrirBanco(): Promise<IDBDatabase> {
  if (bancoPromise) return bancoPromise

  bancoPromise = new Promise((resolve, reject) => {
    const requisicao = indexedDB.open(NOME_BANCO, VERSAO_BANCO)

    requisicao.onupgradeneeded = () => {
      const banco = requisicao.result
      if (!banco.objectStoreNames.contains(STORE_CACHE)) {
        banco.createObjectStore(STORE_CACHE, { keyPath: 'chave' })
      }
      if (!banco.objectStoreNames.contains(STORE_ACOES)) {
        banco.createObjectStore(STORE_ACOES, { keyPath: 'idLocal' })
      }
    }

    requisicao.onsuccess = () => resolve(requisicao.result)
    requisicao.onerror = () => reject(requisicao.error)
  })

  return bancoPromise
}

function comStore<T>(
  nomeStore: string,
  modo: IDBTransactionMode,
  executar: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return abrirBanco().then(
    (banco) =>
      new Promise<T>((resolve, reject) => {
        const transacao = banco.transaction(nomeStore, modo)
        const requisicao = executar(transacao.objectStore(nomeStore))
        requisicao.onsuccess = () => resolve(requisicao.result)
        requisicao.onerror = () => reject(requisicao.error)
      }),
  )
}

export async function salvarCacheDados<T>(chave: string, dados: T): Promise<void> {
  const entrada: CacheDados<T> = { chave, dados, sincronizadoEm: new Date().toISOString() }
  await comStore(STORE_CACHE, 'readwrite', (store) => store.put(entrada))
}

export async function lerCacheDados<T>(chave: string): Promise<CacheDados<T> | null> {
  const resultado = await comStore<CacheDados<T> | undefined>(STORE_CACHE, 'readonly', (store) =>
    store.get(chave),
  )
  return resultado ?? null
}

export async function enfileirarAcaoPendente(
  acao: Pick<AcaoPendente, 'metodo' | 'caminho' | 'corpo'>,
): Promise<void> {
  const entrada: AcaoPendente = {
    idLocal: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    metodo: acao.metodo,
    caminho: acao.caminho,
    corpo: acao.corpo,
    criadoEm: new Date().toISOString(),
    tentativas: 0,
  }
  await comStore(STORE_ACOES, 'readwrite', (store) => store.add(entrada))
}

export async function listarAcoesPendentes(): Promise<AcaoPendente[]> {
  return comStore<AcaoPendente[]>(STORE_ACOES, 'readonly', (store) => store.getAll())
}

export async function removerAcaoPendente(idLocal: string): Promise<void> {
  await comStore(STORE_ACOES, 'readwrite', (store) => store.delete(idLocal))
}

export async function incrementarTentativa(acao: AcaoPendente): Promise<void> {
  await comStore(STORE_ACOES, 'readwrite', (store) =>
    store.put({ ...acao, tentativas: acao.tentativas + 1 }),
  )
}
