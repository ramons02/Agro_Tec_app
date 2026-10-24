import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { detalharUsuario } from '../../lib/acoesUsuarios'
import type { AcaoAuditoria, DetalheUsuario } from '../../types'

interface Props {
  usuarioId: string
  onFechar: () => void
}

const ACAO_ROTULO: Record<AcaoAuditoria, string> = {
  CONFIRMAR: 'Cadastro confirmado',
  RECUSAR: 'Cadastro recusado',
  CRIAR: 'Conta criada pelo administrador',
  SUSPENDER: 'Conta suspensa',
  REATIVAR: 'Conta reativada',
  REDEFINIR_SENHA: 'Senha redefinida',
  EDITAR: 'Dados editados',
  SENHA_ESQUECIDA: 'Pediu nova senha (esqueceu a senha)',
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Dados da conta e o histórico das ações de gestão sobre ela (quem fez o quê e quando). */
export function DetalheUsuarioDialog({ usuarioId, onFechar }: Props) {
  const [detalhe, setDetalhe] = useState<DetalheUsuario | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    detalharUsuario(usuarioId)
      .then((d) => {
        if (!cancelado) setDetalhe(d)
      })
      .catch(() => {
        if (!cancelado) setErro('Não consegui carregar o histórico desta conta.')
      })
    return () => {
      cancelado = true
    }
  }, [usuarioId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true">
      <div className="max-h-[85vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">Detalhe da conta</h2>

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        {!detalhe && !erro && <p className="text-sm text-slate-400">Carregando…</p>}

        {detalhe && (
          <>
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-900">{detalhe.nome ?? 'Sem nome'}</p>
              <p>{detalhe.email}</p>
              <p className="mt-1 text-xs text-slate-400">Cadastrada em {formatarData(detalhe.criadoEm)}</p>
              {detalhe.status === 'SUSPENSA' && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-red-700">
                  Suspensa{detalhe.motivoSuspensao ? `: ${detalhe.motivoSuspensao}` : '.'}
                </p>
              )}
              {detalhe.precisaTrocarSenha && (
                <p className="mt-2 text-xs text-amber-700">Ainda não definiu a própria senha (usa a senha temporária).</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Histórico</h3>
              {detalhe.historico.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma ação de gestão registrada para esta conta.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {detalhe.historico.map((h, i) => (
                    <li key={`${h.criadoEm}-${i}`} className="px-3 py-2 text-sm">
                      <p className="font-medium text-slate-800">{ACAO_ROTULO[h.acao]}</p>
                      <p className="text-xs text-slate-500">
                        {h.atorNome} · {formatarData(h.criadoEm)}
                        {h.detalhe ? ` · ${h.detalhe}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button onClick={onFechar}>Fechar</Button>
        </div>
      </div>
    </div>
  )
}
