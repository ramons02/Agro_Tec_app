import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ApiError } from '../lib/apiClient'
import { useAuth } from '../store/AuthContext'
import type { Papel } from '../types'

const PAPEIS: Array<{ valor: Papel; label: string }> = [
  { valor: 'PRODUTOR_RURAL', label: 'Produtor rural' },
  { valor: 'AGRONOMO', label: 'Agrônomo' },
  { valor: 'ADMIN_MASTER', label: 'Administrador da plataforma' },
]

export function CadastroContaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Gestor só se cadastra por convite: sem o token no link, a opção nem aparece.
  // Só quem tem convite escolhe a senha; produtor e agrônomo recebem uma senha temporária do administrador.
  const convite = searchParams.get('convite')
  // Link de cadastro do grupo de um Admin: a conta nasce pendente nesse grupo e o Admin dele decide.
  const grupo = searchParams.get('grupo')
  const papeisDisponiveis = PAPEIS.filter((p) => p.valor !== 'ADMIN_MASTER' || convite)
  const { registrar } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState<Papel>(convite ? 'ADMIN_MASTER' : 'PRODUTOR_RURAL')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)

    if (convite && senha.length < 8) {
      setErro('A senha precisa ter no mínimo 8 caracteres.')
      return
    }

    setEnviando(true)
    try {
      await registrar(nome, email, convite ? senha : undefined, papel, convite ?? undefined, grupo ?? undefined)
      setConcluido(true)
    } catch (excecao) {
      setErro(
        excecao instanceof ApiError ? excecao.message : 'Não consegui criar a conta. Tente novamente.',
      )
    } finally {
      setEnviando(false)
    }
  }

  if (concluido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-slate-100 px-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          {convite ? (
            <>
              <p className="text-sm font-semibold text-slate-900">Conta criada com sucesso.</p>
              <p className="text-sm text-slate-500">Já pode entrar com o e-mail e a senha cadastrados.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-900">Cadastro recebido, aguarde a confirmação.</p>
              <p className="text-sm text-slate-500">
                {grupo ? 'O administrador do seu grupo' : 'O administrador'} vai avaliar o seu cadastro e passar a você
                uma senha de acesso. Depois disso é só entrar com o e-mail cadastrado.
              </p>
            </>
          )}
          <Button className="w-full" onClick={() => navigate('/login')}>
            Ir para o login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Criar conta</h1>
          <p className="text-sm text-slate-500">AgroClima Pará</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
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

          {convite && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Papel</label>
            <div className="space-y-1.5">
              {papeisDisponiveis.map((p) => (
                <label
                  key={p.valor}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    papel === p.valor
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="papel"
                    checked={papel === p.valor}
                    onChange={() => setPapel(p.valor)}
                  />
                  <span className="text-slate-800">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Enviando…' : convite ? 'Criar conta' : 'Enviar cadastro'}
          </Button>

          <p className="text-center text-xs text-slate-500">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-emerald-700 hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
