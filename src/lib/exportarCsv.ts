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
 * Salva um arquivo já pronto (ex.: o CSV vindo de `GET
 * /dashboard/plantio/exportar.csv`, feature 015) no dispositivo do usuário.
 * Fora do Artifact (rodando `npm run dev` ou um build real), baixa via Blob +
 * `<a download>`. Dentro do Artifact publicado, esse download é bloqueado
 * pelo sandbox do visualizador — então tenta primeiro a capability
 * `downloads` (`window.claude.use('downloads')`), que pede confirmação
 * explícita ao viewer antes de salvar.
 */
export async function salvarArquivo(blob: Blob, nomeArquivo: string) {
  const claude = claudeGlobalDoHost()
  if (claude?.use) {
    try {
      const downloads = await claude.use('downloads')
      if (downloads) {
        await downloads.save({ filename: nomeArquivo, data: await blob.text() })
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

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}
