import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAppData } from '../store/AppDataContext'
import type { Papel } from '../types'

const PAPEIS: Array<{ valor: Papel; label: string; descricao: string }> = [
  {
    valor: 'PRODUTOR_RURAL',
    label: 'Produtor rural',
    descricao: 'Gerencia as próprias propriedades e talhões',
  },
  {
    valor: 'AGRONOMO',
    label: 'Agrônomo',
    descricao: 'Acesso de leitura às propriedades vinculadas',
  },
  {
    valor: 'GESTOR_TECNOLOGIA',
    label: 'Gestor de tecnologia',
    descricao: 'Acesso completo a todas as propriedades',
  },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { definirPapel } = useAppData()
  const [usuario, setUsuario] = useState('joao.bezerra')
  const [senha, setSenha] = useState('••••••••')
  const [papel, setPapel] = useState<Papel>('PRODUTOR_RURAL')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    definirPapel(papel)
    navigate('/mapa')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
              <path d="M5 13c0-6 4-9 14-9 0 10-4 14-14 14v-5Z" strokeLinejoin="round" />
              <path d="M5 18c4-4 8-6 14-14" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">AgroClima Pará</h1>
            <p className="text-sm text-slate-500">Inteligência agroclimática para o campo</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Usuário
            </label>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Entrar como
            </label>
            <div className="space-y-1.5">
              {PAPEIS.map((p) => (
                <label
                  key={p.valor}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
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
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium text-slate-800">{p.label}</span>
                    <span className="block text-xs text-slate-500">{p.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full">
            Entrar
          </Button>

          <p className="text-center text-xs text-slate-400">
            Protótipo de demonstração — HU-01: autenticação via token JWT · HU-14: perfis de
            acesso ⚠️
          </p>
        </form>
      </div>
    </div>
  )
}
