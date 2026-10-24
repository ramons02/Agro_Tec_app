import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import type { ItemGrupo } from '../../lib/acoesGrupos'
import type { Papel } from '../../types'

interface Props {
  executando: boolean
  erro: string | null
  /** Só o Master escolhe o grupo; o Admin cria sempre no dele. */
  grupos?: ItemGrupo[]
  onCriar: (nome: string, email: string, papel: Papel, grupoId?: string) => void
  onCancelar: () => void
}

// Gestor não aparece: só entra por convite (HU-13).
const PAPEIS: Array<{ valor: Papel; label: string }> = [
  { valor: 'PRODUTOR_RURAL', label: 'Produtor rural' },
  { valor: 'AGRONOMO', label: 'Agrônomo' },
]

/** Cria uma conta já ativa, sem passar pela fila de aprovação; a senha temporária aparece em seguida. */
export function NovoUsuarioDialog({ executando, erro, grupos, onCriar, onCancelar }: Props) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<Papel>('PRODUTOR_RURAL')
  const [grupoId, setGrupoId] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onCriar(nome.trim(), email.trim(), papel, grupoId || undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Novo usuário</h2>
          <p className="mt-1 text-sm text-slate-500">
            A conta nasce ativa. O sistema gera uma senha temporária, que aparece uma única vez para você repassar.
          </p>
        </div>

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
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Papel</label>
          <div className="space-y-1.5">
            {PAPEIS.map((p) => (
              <label
                key={p.valor}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  papel === p.valor ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input type="radio" name="papel-novo" checked={papel === p.valor} onChange={() => setPapel(p.valor)} />
                <span className="text-slate-800">{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {grupos && grupos.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Grupo</label>
            <select
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">O meu grupo</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancelar} disabled={executando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={executando}>
            {executando ? 'Criando…' : 'Criar usuário'}
          </Button>
        </div>
      </form>
    </div>
  )
}
