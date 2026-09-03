import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { apiPost, ApiError } from '../lib/apiClient'

export function RedefinirSenhaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [novaSenha, setNovaSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)

    if (novaSenha.length < 8) {
      setErro('A senha precisa ter no mínimo 8 caracteres.')
      return
    }

    setEnviando(true)
    try {
      await apiPost('/api/v1/auth/redefinir-senha', { token, nova_senha: novaSenha })
      setConcluido(true)
    } catch (excecao) {
      setErro(
        excecao instanceof ApiError
          ? excecao.message
          : 'Não consegui redefinir a senha. Tente novamente.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Redefinir senha</h1>
          <p className="text-sm text-slate-500">AgroClima Pará</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {!token ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Link inválido — faltou o token de redefinição. Solicite um novo link.
            </p>
          ) : concluido ? (
            <>
              <p className="text-sm text-slate-700">Senha redefinida com sucesso.</p>
              <Button className="w-full" onClick={() => navigate('/login')}>
                Ir para o login
              </Button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Nova senha</label>
                <input
                  type="password"
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? 'Redefinindo…' : 'Redefinir senha'}
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-slate-500">
            <Link to="/login" className="font-medium text-emerald-700 hover:underline">
              Voltar para o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
