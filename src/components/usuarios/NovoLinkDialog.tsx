import { useState } from 'react'
import { Button } from '../ui/Button'
import { gerarNovoLink } from '../../lib/acoesGrupos'
import { ApiError } from '../../lib/apiClient'

interface Props {
  grupoId: string
  grupoNome: string
  onFechar: () => void
}

/** Gera o link de cadastro do grupo. O link novo só aparece aqui e o anterior para de valer na hora. */
export function NovoLinkDialog({ grupoId, grupoNome, onFechar }: Props) {
  const [link, setLink] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function gerar() {
    setGerando(true)
    setErro(null)
    try {
      setLink((await gerarNovoLink(grupoId)).link)
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : 'Não consegui gerar o link. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  async function copiar() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Link de cadastro do grupo</h2>
          <p className="mt-1 text-sm text-slate-500">{grupoNome}</p>
        </div>

        {!link ? (
          <>
            <p className="text-sm text-slate-600">
              Quem se cadastrar por este link cai pendente no seu grupo e só entra depois da sua confirmação. Gerar um
              novo link <strong>desativa o anterior na hora</strong>: quem ainda tiver o link antigo não consegue mais se
              cadastrar por ele.
            </p>
            {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onFechar} disabled={gerando}>
                Cancelar
              </Button>
              <Button onClick={() => void gerar()} disabled={gerando}>
                {gerando ? 'Gerando…' : 'Gerar novo link'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Link novo</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900"
                />
                <Button variant="secondary" onClick={() => void copiar()}>
                  {copiado ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              O link aparece <strong>só agora</strong>. Copie e envie para o seu pessoal. Se fechar sem copiar, gere outro.
            </div>
            <div className="flex justify-end">
              <Button onClick={onFechar}>Fechar</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
