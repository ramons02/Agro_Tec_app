// Peças compartilhadas pelos scripts de validação responsiva (spec 027): Chrome headless por CDP e login por papel.
import { mkdtempSync, rmSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type Papel = 'ADMIN_MASTER' | 'GESTOR_TECNOLOGIA' | 'PRODUTOR_RURAL' | 'AGRONOMO'

// ---------- CDP ----------
export class Cdp {
  private id = 0
  private pendentes = new Map<number, (v: any) => void>()
  eventos: ((m: any) => void)[] = []
  private constructor(private ws: WebSocket) {
    ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data))
      if (m.method) this.eventos.forEach((f) => f(m))
      if (m.id && this.pendentes.has(m.id)) {
        this.pendentes.get(m.id)!(m)
        this.pendentes.delete(m.id)
      }
    }
  }
  static async conectar(url: string) {
    const ws = new WebSocket(url)
    await new Promise<void>((ok, erro) => {
      ws.onopen = () => ok()
      ws.onerror = () => erro(new Error('falha ao conectar no Chrome'))
    })
    return new Cdp(ws)
  }
  enviar(method: string, params: object = {}): Promise<any> {
    const id = ++this.id
    return new Promise((ok, erro) => {
      this.pendentes.set(id, (m) => (m.error ? erro(new Error(`${method}: ${m.error.message}`)) : ok(m.result)))
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (this.pendentes.delete(id)) erro(new Error(`${method}: sem resposta em 30 s`))
      }, 30000)
    })
  }
  fechar() {
    this.ws.close()
  }
}

export const dorme = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function iniciarChrome() {
  const porta = 9333 + Math.floor(Math.random() * 500)
  // Perfil temporário fora da pasta de saída: o perfil do Chrome tem centenas de MB e guarda localStorage (token de teste).
  const perfil = mkdtempSync(join(tmpdir(), 'validar-responsivo-'))
  const proc = spawn(
    'google-chrome',
    [`--remote-debugging-port=${porta}`, '--headless=new', '--no-sandbox', '--disable-gpu', `--user-data-dir=${perfil}`, 'about:blank'],
    { stdio: 'ignore' },
  )
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json`)
      const abas = (await r.json()) as { type: string; webSocketDebuggerUrl: string }[]
      const aba = abas.find((a) => a.type === 'page')
      if (aba) return { proc, perfil, cdp: await Cdp.conectar(aba.webSocketDebuggerUrl) }
    } catch {
      // Chrome ainda subindo
    }
    await dorme(200)
  }
  proc.kill()
  rmSync(perfil, { recursive: true, force: true })
  throw new Error('Chrome não subiu')
}


export async function login(api: string, papel: Papel, conta: { email: string; senha: string }) {
  const r = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: conta.email, senha: conta.senha }),
  })
  if (!r.ok) throw new Error(`login de ${papel} recusado (${r.status})`)
  const corpo = (await r.json()) as { dados?: { token: string; papel: string }; token?: string; papel?: string }
  const d = corpo.dados ?? (corpo as { token: string; papel: string })
  return { token: d.token, papel: d.papel }
}

