import { useRef, useState } from 'react'
import { Button } from '../ui/Button'
import type { SenhaTemporaria } from '../../types'

interface Props {
  senha: SenhaTemporaria
  /** Texto de contexto: o que acabou de acontecer com a conta (confirmada, criada, senha redefinida). */
  titulo: string
  onFechar: () => void
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

/** Mostra a senha temporária uma única vez. A senha vive só neste componente: ao fechar, é descartada
 * e não existe nenhuma tela que a mostre de novo (para outra, o administrador redefine a senha). */
export function SenhaTemporariaDialog({ senha, titulo, onFechar }: Props) {
  const campo = useRef<HTMLInputElement>(null)
  const [copiada, setCopiada] = useState(false)
  const [erroCopia, setErroCopia] = useState(false)

  async function copiar() {
    setErroCopia(false)
    try {
      await navigator.clipboard.writeText(senha.senhaTemporaria)
      setCopiada(true)
    } catch {
      // Sem permissão de área de transferência: seleciona o texto para o gestor copiar na mão.
      campo.current?.select()
      setErroCopia(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {senha.nome ?? 'Sem nome'} · {senha.email}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Senha temporária</label>
          <div className="flex gap-2">
            <input
              ref={campo}
              readOnly
              value={senha.senhaTemporaria}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm tracking-wide text-slate-900"
            />
            <Button variant="secondary" onClick={copiar}>
              {copiada ? 'Copiada' : 'Copiar'}
            </Button>
          </div>
          {erroCopia && (
            <p className="mt-1.5 text-xs text-amber-700">Não consegui copiar sozinho. A senha está selecionada: use Ctrl+C.</p>
          )}
        </div>

        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Esta senha aparece <strong>só agora</strong>. Copie e envie para a pessoa (por WhatsApp, por exemplo). Ela
          vale até {formatarData(senha.expiraEm)} e a pessoa vai definir a própria senha no primeiro acesso. Se
          fechar sem copiar, é preciso redefinir a senha para gerar outra.
        </div>

        <div className="flex justify-end">
          <Button onClick={onFechar}>Fechar</Button>
        </div>
      </div>
    </div>
  )
}
