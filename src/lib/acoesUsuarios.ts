import type { DetalheUsuario, EventoHistorico, Papel, SenhaTemporaria, StatusConta } from '../types'
import { apiDelete, apiGet, apiPatch, apiPost } from './apiClient'

interface SenhaTemporariaApi {
  id: string
  nome: string | null
  email: string
  senha_temporaria: string
  senha_temporaria_expira_em: string
}

function paraSenhaTemporaria(r: SenhaTemporariaApi): SenhaTemporaria {
  return {
    id: r.id,
    nome: r.nome,
    email: r.email,
    senhaTemporaria: r.senha_temporaria,
    expiraEm: r.senha_temporaria_expira_em,
  }
}

/** Ações de gestão de contas (só gestor). As que geram senha devolvem o texto claro uma única vez:
 * quem chama o guarda só em estado local do componente, nunca em cache de consulta nem no navegador. */

interface DetalheUsuarioApi {
  id: string
  nome: string | null
  email: string
  papel: Papel
  status: StatusConta
  precisa_trocar_senha: boolean
  motivo_suspensao: string | null
  criado_em: string
  historico: Array<{ acao: EventoHistorico['acao']; ator_nome: string; detalhe: string | null; criado_em: string }>
}

/** Conta e histórico de ações de gestão sobre ela. */
export async function detalharUsuario(id: string): Promise<DetalheUsuario> {
  const r = await apiGet<DetalheUsuarioApi>(`/api/v1/usuarios/${id}`)
  return {
    id: r.id,
    nome: r.nome,
    email: r.email,
    papel: r.papel,
    status: r.status,
    precisaTrocarSenha: r.precisa_trocar_senha,
    motivoSuspensao: r.motivo_suspensao,
    criadoEm: r.criado_em,
    historico: r.historico.map((h) => ({
      acao: h.acao,
      atorNome: h.ator_nome,
      detalhe: h.detalhe,
      criadoEm: h.criado_em,
    })),
  }
}

/** Cria produtor ou agrônomo já ATIVO, com senha temporária (gestor só entra por convite). */
export async function criarUsuario(nome: string, email: string, papel: Papel): Promise<SenhaTemporaria> {
  return paraSenhaTemporaria(await apiPost<SenhaTemporariaApi>('/api/v1/usuarios', { nome, email, papel }))
}

/** Nova senha temporária: a antiga e as sessões abertas da conta deixam de valer. */
export async function redefinirSenhaUsuario(id: string): Promise<SenhaTemporaria> {
  return paraSenhaTemporaria(await apiPost<SenhaTemporariaApi>(`/api/v1/usuarios/${id}/redefinir-senha`))
}

/** Corrige nome e/ou e-mail; trocar o e-mail derruba as sessões abertas da conta. */
export async function editarUsuario(id: string, alteracoes: { nome?: string; email?: string }): Promise<void> {
  await apiPatch(`/api/v1/usuarios/${id}`, alteracoes)
}

/** PENDENTE -> ATIVA, com senha temporária. */
export async function confirmarUsuario(id: string): Promise<SenhaTemporaria> {
  return paraSenhaTemporaria(await apiPost<SenhaTemporariaApi>(`/api/v1/usuarios/${id}/confirmar`))
}

/** ATIVA -> SUSPENSA; o motivo é opcional e só o administrador o vê. */
export async function suspenderUsuario(id: string, motivo?: string): Promise<void> {
  await apiPost(`/api/v1/usuarios/${id}/suspender`, motivo?.trim() ? { motivo: motivo.trim() } : undefined)
}

/** SUSPENSA -> ATIVA, sem trocar a senha. */
export async function reativarUsuario(id: string): Promise<void> {
  await apiPost(`/api/v1/usuarios/${id}/reativar`)
}

/** Recusa um cadastro pendente (apaga o cadastro). */
export async function recusarUsuario(id: string): Promise<void> {
  await apiDelete(`/api/v1/usuarios/${id}`)
}
