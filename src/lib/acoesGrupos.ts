import type { GrupoResumo, SenhaTemporaria } from '../types'
import { apiDelete, apiGet, apiPatch, apiPost } from './apiClient'

export interface ItemGrupo {
  id: string
  nome: string
  admin: { id: string; nome: string | null; email: string } | null
  usuarios: number
  criadoEm: string
}

interface ItemGrupoApi {
  id: string
  nome: string
  admin: { id: string; nome: string | null; email: string } | null
  usuarios: number
  criado_em: string
}

/** Master: todos os grupos; Admin: o dele. */
export async function listarGrupos(): Promise<ItemGrupo[]> {
  const r = await apiGet<{ itens: ItemGrupoApi[] }>('/api/v1/grupos')
  return r.itens.map((g) => ({ id: g.id, nome: g.nome, admin: g.admin, usuarios: g.usuarios, criadoEm: g.criado_em }))
}

/** Cria o grupo e o Admin dele (Master). A senha temporária do Admin vem só nesta resposta. */
export async function criarGrupo(nome: string, adminNome: string, adminEmail: string): Promise<SenhaTemporaria> {
  const r = await apiPost<{
    id: string
    nome: string
    admin: { id: string; nome: string | null; email: string }
    senha_temporaria: string
    senha_temporaria_expira_em: string
  }>('/api/v1/grupos', { nome, admin_nome: adminNome, admin_email: adminEmail })
  return {
    id: r.admin.id,
    nome: r.admin.nome,
    email: r.admin.email,
    senhaTemporaria: r.senha_temporaria,
    expiraEm: r.senha_temporaria_expira_em,
  }
}

/** Renomeia o grupo (Master). */
export async function renomearGrupo(grupoId: string, nome: string): Promise<void> {
  await apiPatch(`/api/v1/grupos/${grupoId}`, { nome })
}

/** Exclui um grupo vazio (Master). Com contas ou propriedades a API recusa com 409 e a mensagem explica o motivo. */
export async function excluirGrupo(grupoId: string): Promise<void> {
  await apiDelete(`/api/v1/grupos/${grupoId}`)
}

/** Passa todos os produtores e agrônomos de um grupo para outro (Master). */
export async function reatribuirGrupo(origemId: string, destinoId: string): Promise<{ produtores: number; agronomos: number }> {
  return apiPost(`/api/v1/grupos/${origemId}/reatribuir`, { grupo_destino_id: destinoId })
}

/** Move um produtor (com propriedades e talhões) ou um agrônomo de grupo (Master). */
export async function moverUsuario(usuarioId: string, grupoId: string, grupoOrigemId?: string): Promise<void> {
  await apiPost(`/api/v1/usuarios/${usuarioId}/mover`, {
    grupo_id: grupoId,
    ...(grupoOrigemId ? { grupo_origem_id: grupoOrigemId } : {}),
  })
}

/** Tira o agrônomo do grupo e encerra os vínculos dele com as propriedades do grupo (Master ou Admin do grupo). */
export async function removerAgronomoDoGrupo(grupoId: string, agronomoId: string): Promise<void> {
  await apiDelete(`/api/v1/grupos/${grupoId}/agronomos/${agronomoId}`)
}

/** Novo link de cadastro do grupo (Master ou Admin do grupo): o anterior para de valer na hora e o novo só aparece aqui. */
export async function gerarNovoLink(grupoId: string): Promise<{ link: string; geradoEm: string }> {
  const r = await apiPost<{ link: string; gerado_em: string }>(`/api/v1/grupos/${grupoId}/novo-link`)
  return { link: r.link, geradoEm: r.gerado_em }
}

/** Convite de uso único para um novo Master; devolve o link para o Master copiar. */
export async function convidarMaster(email: string): Promise<{ link: string; expiraEm: string }> {
  const r = await apiPost<{ link: string; expira_em: string }>('/api/v1/auth/convites-master', { email })
  return { link: r.link, expiraEm: r.expira_em }
}

export type { GrupoResumo }
