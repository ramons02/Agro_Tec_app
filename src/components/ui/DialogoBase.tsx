import { useEffect, useRef, type ReactNode } from 'react'

interface DialogoBaseProps {
  /** Rótulo para leitores de tela; o título visível fica por conta de quem usa. */
  rotulo?: string
  /** Chamado com Esc. Sem ele, Esc não fecha (diálogos que exigem decisão explícita). */
  aoFechar?: () => void
  /** Classes extras do painel (por exemplo `space-y-4`). */
  className?: string
  children: ReactNode
}

/**
 * Moldura única dos diálogos (spec 027, FR-012): cabe em 320 px, nunca passa da altura visível da tela
 * (`dvh` acompanha o teclado virtual no Chrome para Android), rola por dentro quando é alto e leva o campo em
 * foco para a vista (o iOS ignora o redimensionamento da página pelo teclado).
 */
export function DialogoBase({ rotulo, aoFechar, className = '', children }: DialogoBaseProps) {
  const painel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const abertoPor = document.activeElement as HTMLElement | null
    painel.current?.focus({ preventScroll: true })
    return () => abertoPor?.focus?.()
  }, [])

  useEffect(() => {
    if (!aoFechar) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoFechar?.()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={rotulo}
    >
      <div
        ref={painel}
        tabIndex={-1}
        onFocusCapture={(evento) => {
          const alvo = evento.target as HTMLElement
          if (/^(INPUT|SELECT|TEXTAREA)$/.test(alvo.tagName)) alvo.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }}
        className={`max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
