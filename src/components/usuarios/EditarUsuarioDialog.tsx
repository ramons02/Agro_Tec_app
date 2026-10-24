import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import type { UsuarioListado } from '../../types'

interface Props {
  usuario: UsuarioListado
  executando: boolean
  erro: string | null
  onSalvar: (alteracoes: { nome?: string; email?: string }) => void
  onCancelar: () => void
}

/** Corrige nome e e-mail (cadastro com erro de digitação, e-mail que ninguém lê). */
export function EditarUsuarioDialog({ usuario, executando, erro, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState(usuario.nome ?? '')
  const [email, setEmail] = useState(usuario.email)
  const mudouEmail = email.trim() !== usuario.email
  const mudouNome = nome.trim() !== (usuario.nome ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSalvar({
      ...(mudouNome ? { nome: nome.trim() } : {}),
      ...(mudouEmail ? { email: email.trim() } : {}),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">Editar conta</h2>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          {mudouEmail && (
            <p className="mt-1.5 text-xs text-amber-700">
              Ao trocar o e-mail, a sessão aberta desta conta cai e a pessoa entra de novo com o e-mail novo.
            </p>
          )}
        </div>

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancelar} disabled={executando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={executando || (!mudouNome && !mudouEmail)}>
            {executando ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
