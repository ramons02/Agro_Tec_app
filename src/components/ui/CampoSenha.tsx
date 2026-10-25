import { useState, type InputHTMLAttributes } from 'react'

type CampoSenhaProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

/** Campo de senha com o botão do olho para mostrar ou esconder o que foi digitado. */
export function CampoSenha(props: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false)
  const rotulo = visivel ? 'Esconder a senha' : 'Mostrar a senha'

  return (
    <div className="relative">
      <input
        {...props}
        type={visivel ? 'text' : 'password'}
        className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-11 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={rotulo}
        aria-pressed={visivel}
        title={rotulo}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-400 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-emerald-500"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visivel && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  )
}
