import { useEffect, useState } from 'react'
import { acoesRecusadas, aoMudarFila, dispensarAcaoRecusada } from '../lib/filaSincronizacao'
import type { AcaoPendente } from '../lib/indexedDb'

function descrever(acao: AcaoPendente): string {
  const nome = (acao.corpo as { nome?: unknown } | null)?.nome
  const rotulo = typeof nome === 'string' ? ` “${nome}”` : ''
  if (acao.metodo === 'POST' && acao.caminho.endsWith('/talhoes')) return `O talhão${rotulo}`
  if (acao.metodo === 'POST' && acao.caminho.endsWith('/propriedades')) return `A propriedade${rotulo}`
  if (acao.metodo === 'DELETE') return 'Uma exclusão'
  return 'Uma alteração'
}

/**
 * Cadastro feito sem internet que o servidor recusou ao sincronizar (talhão fora do Pará, sobreposto a outro...).
 * Sem este aviso a pessoa acharia que o talhão foi salvo, porque ele aparecia na tela enquanto estava offline.
 */
export function AvisoDeRecusadas() {
  const [recusadas, setRecusadas] = useState<AcaoPendente[]>([])

  useEffect(() => {
    const atualizar = () => void acoesRecusadas().then(setRecusadas)
    atualizar()
    return aoMudarFila(atualizar)
  }, [])

  if (recusadas.length === 0) return null

  return (
    <div className="mb-4 space-y-2" role="alert">
      {recusadas.map((acao) => (
        <div
          key={acao.idLocal}
          className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="min-w-0 break-words">
            <strong>{descrever(acao)} feito sem internet não foi salvo.</strong>{' '}
            {acao.motivoRecusa ?? 'O servidor recusou o envio.'} Refaça o cadastro com internet.
          </p>
          <button
            onClick={() => void dispensarAcaoRecusada(acao.idLocal)}
            className="min-h-11 shrink-0 rounded-lg px-3 font-medium text-red-800 hover:bg-red-100"
          >
            Entendi
          </button>
        </div>
      ))}
    </div>
  )
}
