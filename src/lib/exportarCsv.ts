interface DownloadsNamespace {
  save: (request: { filename: string; data: string }) => Promise<{ status: string }>
}

interface ClaudeGlobal {
  use: (name: string) => Promise<DownloadsNamespace | null>
}

function claudeGlobalDoHost(): ClaudeGlobal | undefined {
  return (window as typeof window & { claude?: ClaudeGlobal }).claude
}

/**
 * Exportação client-side simples (RF034, provisório). Fora do Artifact (rodando
 * `npm run dev` ou um build real), baixa via Blob + <a download>. Dentro do
 * Artifact publicado, esse download é bloqueado pelo sandbox do visualizador —
 * então tenta primeiro a capability `downloads` (window.claude.use('downloads')),
 * que pede confirmação explícita ao viewer antes de salvar.
 */
export async function exportarCsv(linhas: Record<string, string | number>[], nomeArquivo: string) {
  if (linhas.length === 0) return

  const cabecalhos = Object.keys(linhas[0])

  function escapar(valor: string | number) {
    const texto = String(valor)
    return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }

  const corpo = [cabecalhos, ...linhas.map((linha) => cabecalhos.map((c) => linha[c]))]
    .map((colunas) => colunas.map(escapar).join(';'))
    .join('\n')
  // BOM no início para o Excel reconhecer UTF-8 e não corromper acentos.
  const conteudo = '﻿' + corpo

  const claude = claudeGlobalDoHost()
  if (claude?.use) {
    try {
      const downloads = await claude.use('downloads')
      if (downloads) {
        await downloads.save({ filename: nomeArquivo, data: conteudo })
        return
      }
      // downloads === null: capability indisponível nesta view — cai pro fallback abaixo.
    } catch (erro) {
      const codigo = (erro as { code?: string } | undefined)?.code
      // Usuário recusou ou já tem um prompt aberto: não insiste com o fallback,
      // que seria um `<a download>` inerte no sandbox do Artifact de qualquer forma.
      if (codigo === 'declined' || codigo === 'rate_limited') return
    }
  }

  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}
