import { useEffect, useRef, useState, type ReactNode } from 'react'

const CONSULTA_DESKTOP = '(min-width: 1024px)'

/** Verdadeiro a partir de 1024 px, onde o menu é a barra lateral fixa de sempre. */
function useDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(CONSULTA_DESKTOP).matches)
  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_DESKTOP)
    const aoMudar = () => setDesktop(consulta.matches)
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])
  return desktop
}

interface GavetaProps {
  id: string
  aberta: boolean
  aoFechar: () => void
  rotulo: string
  children: ReactNode
}

const FOCAVEIS = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Menu lateral que vira gaveta abaixo de 1024 px (spec 027, FR-003): fechada por padrão, abre por um botão do
 * cabeçalho, fecha ao tocar fora, com Esc e ao escolher uma tela (quem usa decide, via `aoFechar`). A partir de
 * 1024 px é a barra lateral fixa, sem camada escura nem comportamento de diálogo.
 */
export function Gaveta({ id, aberta, aoFechar, rotulo, children }: GavetaProps) {
  const desktop = useDesktop()
  const painel = useRef<HTMLElement>(null)
  const comoGaveta = aberta && !desktop

  // `aoFechar` pode mudar de identidade a cada render de quem usa; guardar a última evita refazer os efeitos
  // (e mexer no foco) sem necessidade.
  const fechar = useRef(aoFechar)
  useEffect(() => {
    fechar.current = aoFechar
  })

  // Passou para desktop com a gaveta aberta: o estado volta a "fechada" para não reabrir ao encolher a janela.
  useEffect(() => {
    if (desktop && aberta) fechar.current()
  }, [desktop, aberta])

  useEffect(() => {
    if (!comoGaveta) return
    const abertoPor = document.activeElement as HTMLElement | null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus()

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        fechar.current()
        return
      }
      if (evento.key !== 'Tab' || !painel.current) return
      // Mantém o foco dentro da gaveta enquanto ela está aberta.
      const itens = [...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)]
      if (itens.length === 0) return
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
      abertoPor?.focus()
    }
  }, [comoGaveta])

  return (
    <>
      {comoGaveta && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" aria-hidden="true" onClick={aoFechar} />
      )}
      <aside
        id={id}
        ref={painel}
        aria-label={rotulo}
        role={comoGaveta ? 'dialog' : undefined}
        aria-modal={comoGaveta ? true : undefined}
        // Abaixo de 1024 px fica fora da tela e desliza para dentro; a partir de 1024 px volta ao fluxo normal.
        className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] shrink-0 flex-col border-r border-slate-200 bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-200 lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:pt-0 lg:pb-0 ${
          comoGaveta ? 'translate-x-0' : '-translate-x-full'
        }`}
        inert={!desktop && !aberta ? true : undefined}
      >
        {children}
      </aside>
    </>
  )
}
