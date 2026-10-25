import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface BotaoIconeProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Nome da ação: vira o rótulo para leitor de tela e a dica ao parar o mouse. */
  rotulo: string
  /** Desenho do ícone (filhos de um <svg> 24x24 de traço). */
  children: ReactNode
}

/** Botão só com ícone, área de toque de 44 px. O texto fica fora da tela e só aparece como dica. */
export function BotaoIcone({ rotulo, title, className = '', children, ...props }: BotaoIconeProps) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={title ?? rotulo}
      className={`inline-flex size-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  )
}
