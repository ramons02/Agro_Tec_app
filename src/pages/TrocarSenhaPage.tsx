import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { CampoSenha } from '../components/ui/CampoSenha'
import { ApiError } from '../lib/apiClient'
import { ehGestor } from '../lib/papeis'
import { useAuth } from '../store/AuthContext'

const SENHA_MINIMA = 8

/** Primeiro acesso (senha temporária) e "trocar minha senha". No primeiro acesso a pessoa não chega a
 * nenhuma outra tela antes de definir a senha; quem já está usando o sistema pode voltar. */
export function TrocarSenhaPage() {
  const navigate = useNavigate()
  const { autenticado, papel, precisaTrocarSenha, trocarSenha, sair } = useAuth()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!autenticado) return <Navigate to="/login" replace />
  // Fora do primeiro acesso, só o gestor troca a própria senha (a API também recusa os demais com 403).
  if (!precisaTrocarSenha && !ehGestor(papel)) return <Navigate to="/mapa" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)

    if (senhaNova.length < SENHA_MINIMA) {
      setErro(`A senha nova precisa ter no mínimo ${SENHA_MINIMA} caracteres.`)
      return
    }
    if (senhaNova === senhaAtual) {
      setErro('A senha nova precisa ser diferente da atual.')
      return
    }
    if (senhaNova !== confirmacao) {
      setErro('A confirmação não é igual à senha nova.')
      return
    }

    setEnviando(true)
    try {
      await trocarSenha(senhaAtual, senhaNova)
      navigate('/mapa', { replace: true })
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : 'Não consegui trocar a senha. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  function handleSair() {
    sair()
    navigate('/login')
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            {precisaTrocarSenha ? 'Defina a sua senha' : 'Trocar minha senha'}
          </h1>
          <p className="text-sm text-slate-500">
            {precisaTrocarSenha
              ? 'Você entrou com uma senha temporária. Escolha uma senha só sua para continuar.'
              : 'Informe a senha atual e escolha a nova.'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {precisaTrocarSenha ? 'Senha temporária' : 'Senha atual'}
            </label>
            <CampoSenha
              required
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Senha nova</label>
            <CampoSenha
              required
              autoComplete="new-password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              placeholder={`Mínimo ${SENHA_MINIMA} caracteres`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Repita a senha nova</label>
            <CampoSenha
              required
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>

          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar senha'}
          </Button>

          <p className="text-center text-xs text-slate-500">
            {precisaTrocarSenha ? (
              <button type="button" onClick={handleSair} className="font-medium text-emerald-700 hover:underline">
                Sair
              </button>
            ) : (
              <Link to="/mapa" className="font-medium text-emerald-700 hover:underline">
                Voltar
              </Link>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
