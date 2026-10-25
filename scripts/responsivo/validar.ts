// Validação de layout responsivo (spec 027). Uso:
//   bun scripts/responsivo/validar.ts --saida <pasta> [--app http://localhost:5173] [--api http://localhost:8080] [--contas contas.json] [--so-publicas]
// `contas.json` fica fora do repositório: { "ADMIN_MASTER": {"email": "...", "senha": "..."}, "GESTOR_TECNOLOGIA": {...}, "PRODUTOR_RURAL": {...}, "AGRONOMO": {...} }
// Sem dependência nova: Chrome headless conduzido por CDP (WebSocket do Bun).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const args = process.argv.slice(2)
const opt = (nome: string, padrao?: string) => {
  const i = args.indexOf(`--${nome}`)
  return i >= 0 ? args[i + 1] : padrao
}
const APP = opt('app', 'http://localhost:5173')!
const API = opt('api', 'http://localhost:8080')!
const SAIDA = opt('saida', 'saida-responsivo')!
const ARQUIVO_CONTAS = opt('contas')
const SO_PUBLICAS = args.includes('--so-publicas')

type Papel = 'ADMIN_MASTER' | 'GESTOR_TECNOLOGIA' | 'PRODUTOR_RURAL' | 'AGRONOMO'

const LARGURAS = [
  { nome: '320', w: 320, h: 568 },
  { nome: '320-paisagem', w: 568, h: 320 },
  { nome: '360', w: 360, h: 740 },
  { nome: '360-paisagem', w: 740, h: 360 },
  { nome: '768', w: 768, h: 1024 },
  { nome: '1024', w: 1024, h: 768 },
  { nome: '1440', w: 1440, h: 900 },
]

const TELAS_PUBLICAS = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/trocar-senha']
const TELAS_INTERNAS: { rota: string; papeis: Papel[] }[] = [
  { rota: '/mapa', papeis: ['ADMIN_MASTER', 'GESTOR_TECNOLOGIA', 'PRODUTOR_RURAL', 'AGRONOMO'] },
  { rota: '/propriedades', papeis: ['ADMIN_MASTER', 'GESTOR_TECNOLOGIA', 'PRODUTOR_RURAL', 'AGRONOMO'] },
  { rota: '/pulverizacao', papeis: ['ADMIN_MASTER', 'GESTOR_TECNOLOGIA', 'PRODUTOR_RURAL', 'AGRONOMO'] },
  { rota: '/plantio', papeis: ['ADMIN_MASTER', 'GESTOR_TECNOLOGIA', 'PRODUTOR_RURAL', 'AGRONOMO'] },
  { rota: '/previsao', papeis: ['ADMIN_MASTER', 'GESTOR_TECNOLOGIA', 'PRODUTOR_RURAL', 'AGRONOMO'] },
  { rota: '/talhoes/novo', papeis: ['ADMIN_MASTER', 'GESTOR_TECNOLOGIA', 'PRODUTOR_RURAL'] },
  { rota: '/usuarios', papeis: ['ADMIN_MASTER', 'GESTOR_TECNOLOGIA'] },
  { rota: '/grupos', papeis: ['ADMIN_MASTER'] },
]

// ---------- CDP ----------
class Cdp {
  private id = 0
  private pendentes = new Map<number, (v: any) => void>()
  private constructor(private ws: WebSocket) {
    ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data))
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
    })
  }
  fechar() {
    this.ws.close()
  }
}

const dorme = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function iniciarChrome() {
  const porta = 9333 + Math.floor(Math.random() * 500)
  const perfil = join(SAIDA, '.perfil-chrome')
  mkdirSync(perfil, { recursive: true })
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
      if (aba) return { proc, cdp: await Cdp.conectar(aba.webSocketDebuggerUrl) }
    } catch {
      // Chrome ainda subindo
    }
    await dorme(200)
  }
  proc.kill()
  throw new Error('Chrome não subiu')
}

// Roda dentro da página: mede rolagem horizontal, alvos de toque e elementos fora da janela.
const MEDIR = `(() => {
  const toque = matchMedia('(pointer: coarse)').matches
  const vw = document.documentElement.clientWidth
  const visivel = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'
  }
  const descreve = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' "' + (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 30) + '"')
  const alvos = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab]')]
    .filter(visivel)
    .filter((el) => !el.closest('.leaflet-tile-pane, .leaflet-attribution-flag'))
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => toque && (r.width < 43.5 || r.height < 43.5))
    .map(({ el, r }) => descreve(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height))
  const fora = [...document.querySelectorAll('body *')]
    .filter(visivel)
    .filter((el) => getComputedStyle(el).position !== 'fixed' && !el.closest('.leaflet-container, [aria-hidden=true]'))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1 })
    .slice(0, 5)
    .map((el) => descreve(el))
  return {
    rota: location.pathname,
    larguraJanela: vw,
    rolagemHorizontal: document.documentElement.scrollWidth > vw + 1,
    larguraConteudo: document.documentElement.scrollWidth,
    alvosPequenos: alvos.length,
    exemplosAlvos: alvos.slice(0, 5),
    elementosFora: fora,
  }
})()`

type Resultado = {
  perfil: string
  tela: string
  largura: string
  rolagemHorizontal: boolean
  larguraConteudo: number
  larguraJanela: number
  rotaFinal: string
  alvosPequenos: number
  exemplosAlvos: string[]
  elementosFora: string[]
  captura: string
  erro?: string
}

async function login(papel: Papel, conta: { email: string; senha: string }) {
  const r = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: conta.email, senha: conta.senha }),
  })
  if (!r.ok) throw new Error(`login de ${papel} recusado (${r.status})`)
  const corpo = (await r.json()) as { dados?: { token: string; papel: string }; token?: string; papel?: string }
  const d = corpo.dados ?? (corpo as { token: string; papel: string })
  return { token: d.token, papel: d.papel }
}

async function main() {
  mkdirSync(SAIDA, { recursive: true })
  const { proc, cdp } = await iniciarChrome()
  const resultados: Resultado[] = []

  const contas: Partial<Record<Papel, { email: string; senha: string }>> = ARQUIVO_CONTAS
    ? JSON.parse(readFileSync(ARQUIVO_CONTAS, 'utf8'))
    : {}

  await cdp.enviar('Page.enable')
  await cdp.enviar('Runtime.enable')

  async function medir(perfil: string, rota: string) {
    for (const l of LARGURAS) {
      const movel = l.w < 1024
      await cdp.enviar('Emulation.setDeviceMetricsOverride', {
        width: l.w, height: l.h, deviceScaleFactor: movel ? 2 : 1, mobile: l.w < 768,
      })
      await cdp.enviar('Emulation.setTouchEmulationEnabled', movel ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
      await cdp.enviar('Emulation.setEmulatedMedia', {
        features: [{ name: 'pointer', value: movel ? 'coarse' : 'fine' }, { name: 'hover', value: movel ? 'none' : 'hover' }],
      })
      await cdp.enviar('Page.navigate', { url: `${APP}${rota}` })
      await dorme(2500)
      const nome = `${perfil}${rota.replace(/\//g, '_')}-${l.nome}.jpg`
      let medida: any
      let erro: string | undefined
      try {
        const r = await cdp.enviar('Runtime.evaluate', { expression: MEDIR, returnByValue: true })
        medida = r.result.value
        const shot = await cdp.enviar('Page.captureScreenshot', { format: 'jpeg', quality: 70 })
        writeFileSync(join(SAIDA, nome), Buffer.from(shot.data, 'base64'))
      } catch (e) {
        erro = String(e)
      }
      resultados.push({
        perfil, tela: rota, largura: l.nome,
        rolagemHorizontal: medida?.rolagemHorizontal ?? false,
        larguraConteudo: medida?.larguraConteudo ?? 0,
        larguraJanela: medida?.larguraJanela ?? l.w,
        rotaFinal: medida?.rota ?? '',
        alvosPequenos: medida?.alvosPequenos ?? 0,
        exemplosAlvos: medida?.exemplosAlvos ?? [],
        elementosFora: medida?.elementosFora ?? [],
        captura: nome, erro,
      })
      console.log(`${perfil.padEnd(18)} ${rota.padEnd(15)} ${l.nome.padEnd(13)} ->${(medida?.rota ?? '?').padEnd(14)} rolagem=${medida?.rolagemHorizontal ? 'SIM' : 'nao'} alvos<44=${medida?.alvosPequenos ?? '?'}`)
    }
  }

  // Telas públicas, sem sessão.
  await cdp.enviar('Page.navigate', { url: `${APP}/login` })
  await dorme(1500)
  await cdp.enviar('Runtime.evaluate', { expression: 'localStorage.clear(); sessionStorage.clear()' })
  for (const rota of TELAS_PUBLICAS) await medir('publico', rota)

  if (!SO_PUBLICAS) {
    for (const papel of Object.keys(contas) as Papel[]) {
      const sessao = await login(papel, contas[papel]!)
      await cdp.enviar('Page.navigate', { url: `${APP}/login` })
      await dorme(1000)
      await cdp.enviar('Runtime.evaluate', {
        expression: `localStorage.setItem('agroclima:token', ${JSON.stringify(sessao.token)}); localStorage.setItem('agroclima:papel', ${JSON.stringify(sessao.papel)})`,
      })
      for (const t of TELAS_INTERNAS.filter((x) => x.papeis.includes(papel))) await medir(papel, t.rota)
    }
  }

  cdp.fechar()
  proc.kill()

  writeFileSync(join(SAIDA, 'relatorio.json'), JSON.stringify(resultados, null, 2))
  const falhas = resultados.filter((r) => r.rolagemHorizontal || r.alvosPequenos > 0 || r.elementosFora.length > 0 || r.erro)
  const linhas = [
    '# Relatório de validação responsiva',
    '',
    `Medições: ${resultados.length}. Com falha: ${falhas.length}.`,
    '',
    '| Perfil | Tela | Largura | Rolagem horizontal | Alvos < 44 px | Fora da janela |',
    '|---|---|---|---|---|---|',
    ...resultados.map(
      (r) => `| ${r.perfil} | ${r.tela} | ${r.largura} | ${r.rolagemHorizontal ? `SIM (${r.larguraConteudo} > ${r.larguraJanela})` : 'não'} | ${r.alvosPequenos} | ${r.elementosFora.length} |`,
    ),
  ]
  writeFileSync(join(SAIDA, 'relatorio.md'), linhas.join('\n') + '\n')
  console.log(`\n${resultados.length} medições, ${falhas.length} com falha. Relatório em ${join(SAIDA, 'relatorio.md')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
