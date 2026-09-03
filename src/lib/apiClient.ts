const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const CHAVE_TOKEN = 'agroclima:token'

export class ApiError extends Error {
  codigo: number
  detalhes: unknown

  constructor(codigo: number, mensagem: string, detalhes: unknown) {
    super(mensagem)
    this.codigo = codigo
    this.detalhes = detalhes
  }
}

export function obterToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN)
}

export function definirToken(token: string | null) {
  if (token) localStorage.setItem(CHAVE_TOKEN, token)
  else localStorage.removeItem(CHAVE_TOKEN)
}

interface EnvelopeSucesso<T> {
  status: 'sucesso'
  data_consulta_utc: string
  dados: T
}

interface EnvelopeErro {
  status: 'erro'
  codigo: number
  mensagem: string
  detalhes: unknown
}

async function tratarResposta<T>(resposta: Response): Promise<T> {
  const corpo = (await resposta.json().catch(() => null)) as
    | EnvelopeSucesso<T>
    | EnvelopeErro
    | null

  if (!resposta.ok || corpo?.status === 'erro') {
    if (resposta.status === 401) definirToken(null)
    const erro = corpo as EnvelopeErro | null
    throw new ApiError(
      erro?.codigo ?? resposta.status,
      erro?.mensagem ?? 'Erro inesperado ao falar com a API.',
      erro?.detalhes ?? null,
    )
  }

  return (corpo as EnvelopeSucesso<T>).dados
}

function cabecalhos(comCorpo: boolean): HeadersInit {
  const token = obterToken()
  return {
    ...(comCorpo ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function apiGet<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, { headers: cabecalhos(false) })
  return tratarResposta<T>(resposta)
}

export async function apiPost<T>(caminho: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    method: 'POST',
    headers: cabecalhos(true),
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  })
  return tratarResposta<T>(resposta)
}

export async function apiPut<T>(caminho: string, corpo: unknown): Promise<T> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    method: 'PUT',
    headers: cabecalhos(true),
    body: JSON.stringify(corpo),
  })
  return tratarResposta<T>(resposta)
}

export async function apiDelete(caminho: string): Promise<void> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    method: 'DELETE',
    headers: cabecalhos(false),
  })
  if (resposta.status === 204) return
  await tratarResposta(resposta)
}

/** Para endpoints que devolvem um arquivo (ex.: CSV), não o envelope JSON
 * padrão — usado pela exportação (feature 015). */
export async function apiGetBlob(caminho: string): Promise<Blob> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, { headers: cabecalhos(false) })
  if (!resposta.ok) {
    if (resposta.status === 401) definirToken(null)
    const corpo = (await resposta.json().catch(() => null)) as EnvelopeErro | null
    throw new ApiError(
      corpo?.codigo ?? resposta.status,
      corpo?.mensagem ?? 'Erro inesperado ao falar com a API.',
      corpo?.detalhes ?? null,
    )
  }
  return resposta.blob()
}

export async function apiUpload<T>(caminho: string, formData: FormData): Promise<T> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    method: 'POST',
    headers: cabecalhos(false),
    body: formData,
  })
  return tratarResposta<T>(resposta)
}
