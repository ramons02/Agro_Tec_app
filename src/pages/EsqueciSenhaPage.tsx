import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { apiPost, ApiError } from '../lib/apiClient'

export function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await apiPost('/api/v1/auth/recuperar-senha', { email })
      setEnviado(true)
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : 'Não consegui processar o pedido.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Recuperar senha</h1>
          <p className="text-sm text-slate-500">AgroClima Pará</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {enviado ? (
            <p className="text-sm text-slate-700">
              Se o e-mail existir, um link de redefinição foi enviado. Verifique sua caixa de entrada.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-500">
                Informe o e-mail da sua conta para receber um link de redefinição de senha.
              </p>
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
              {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar link de redefinição'}
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
