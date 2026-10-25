// Cenário da navegação responsiva (spec 027, US1): gaveta abaixo de 1024 px, barra fixa a partir de 1024 px, itens do
// menu por perfil e cartão do avatar dentro da tela. Uso:
//   bun scripts/responsivo/gaveta.ts --contas contas.json [--app http://localhost:5173] [--api http://localhost:8080]
import { readFileSync } from 'node:fs'
import { dorme, iniciarChrome, login, type Papel } from './comum.ts'

const args = process.argv.slice(2)
const opt = (nome: string, padrao?: string) => {
  const i = args.indexOf(`--${nome}`)
  return i >= 0 ? args[i + 1] : padrao
}
const APP = opt('app', 'http://localhost:5173')!
const API = opt('api', 'http://localhost:8080')!
const contas = JSON.parse(readFileSync(opt('contas')!, 'utf8')) as Partial<Record<Papel, { email: string; senha: string }>>

const ITENS: Record<Papel, string[]> = {
  ADMIN_MASTER: ['Mapa de Talhões', 'Propriedades', 'Pulverização', 'Janela de Plantio', 'Previsão do Tempo', 'Cadastrar Talhão', 'Usuários', 'Grupos'],
  GESTOR_TECNOLOGIA: ['Mapa de Talhões', 'Propriedades', 'Pulverização', 'Janela de Plantio', 'Previsão do Tempo', 'Cadastrar Talhão', 'Usuários'],
  PRODUTOR_RURAL: ['Mapa de Talhões', 'Propriedades', 'Pulverização', 'Janela de Plantio', 'Previsão do Tempo', 'Cadastrar Talhão'],
  AGRONOMO: ['Mapa de Talhões', 'Propriedades', 'Pulverização', 'Janela de Plantio', 'Previsão do Tempo'],
}

let falhas = 0
const confere = (ok: boolean, msg: string) => {
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`)
  if (!ok) falhas++
}

const { proc, perfil, cdp } = await iniciarChrome()
await cdp.enviar('Page.enable')
await cdp.enviar('Runtime.enable')
const ev = async <T = any>(expressao: string): Promise<T> =>
  (await cdp.enviar('Runtime.evaluate', { expression: expressao, awaitPromise: true, returnByValue: true })).result.value
const tela = async (largura: number, altura: number) => {
  const movel = largura < 1024
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 2, mobile: largura < 768 })
  await cdp.enviar('Emulation.setTouchEmulationEnabled', movel ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
}
const ir = async (rota: string) => {
  await cdp.enviar('Page.navigate', { url: `${APP}/?r=${Date.now()}#${rota}` })
  await dorme(1800)
}
const tecla = (key: string) =>
  cdp.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: key === 'Escape' ? 27 : 0 })
const toque = async (x: number, y: number) => {
  await cdp.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await cdp.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await dorme(350)
}

const JS = {
  gaveta: `document.querySelector('#menu-principal')`,
  noEcra: `(() => { const r = document.querySelector('#menu-principal').getBoundingClientRect(); return r.right > 1 && r.left >= -1 })()`,
  botao: `document.querySelector('button[aria-controls="menu-principal"]')`,
  botaoVisivel: `(() => { const b = document.querySelector('button[aria-controls="menu-principal"]'); return !!b && b.getBoundingClientRect().width > 0 })()`,
  itens: `[...document.querySelectorAll('#menu-principal nav a')].map(a => a.textContent.trim())`,
  expandido: `document.querySelector('button[aria-controls="menu-principal"]')?.getAttribute('aria-expanded')`,
  camada: `!!document.querySelector('.fixed.inset-0.z-30')`,
  foco: `document.querySelector('#menu-principal').contains(document.activeElement)`,
  rolagemTravada: `document.body.style.overflow === 'hidden'`,
}

for (const papel of Object.keys(contas) as Papel[]) {
  const sessao = await login(API, papel, contas[papel]!)
  await cdp.enviar('Page.navigate', { url: `${APP}/#/login` })
  await dorme(900)
  await ev(`localStorage.setItem('agroclima:token', ${JSON.stringify(sessao.token)}); localStorage.setItem('agroclima:papel', ${JSON.stringify(sessao.papel)})`)

  for (const [w, h] of [[360, 740], [768, 1024]] as const) {
    await tela(w, h)
    await ir('/mapa')
    const rotulo = `${papel} em ${w} px`
    confere(await ev<boolean>(JS.botaoVisivel), `${rotulo}: botão do menu aparece`)
    confere(!(await ev<boolean>(JS.noEcra)), `${rotulo}: gaveta começa fechada`)
    confere((await ev<string>(JS.expandido)) === 'false', `${rotulo}: aria-expanded começa falso`)

    await ev(`${JS.botao}.click()`)
    await dorme(400)
    confere(await ev<boolean>(JS.noEcra), `${rotulo}: botão abre a gaveta`)
    confere((await ev<string>(JS.expandido)) === 'true', `${rotulo}: aria-expanded vira verdadeiro`)
    confere(await ev<boolean>(JS.camada), `${rotulo}: camada escura aparece`)
    confere(await ev<boolean>(JS.foco), `${rotulo}: foco vai para dentro da gaveta`)
    confere(await ev<boolean>(JS.rolagemTravada), `${rotulo}: rolagem da página travada com a gaveta aberta`)
    const itens = await ev<string[]>(JS.itens)
    confere(JSON.stringify(itens) === JSON.stringify(ITENS[papel]), `${rotulo}: itens do menu do perfil (${itens.length}) = esperados (${ITENS[papel].length})`)

    // O mapa (Leaflet usa z-index de 400 a 1000) não pode ficar por cima da gaveta. `elementFromPoint` não serve para
    // isso (a pintura e o teste de acerto divergiram no Chrome), então olha o pixel da captura: sobre a gaveta aberta,
    // ao lado do mapa, a cor tem de ser o branco do menu, nunca a imagem de satélite.
    if (await ev<boolean>(`!!document.querySelector('.leaflet-container')`)) {
      const y = Math.round(h * 0.6)
      const foto = await cdp.enviar('Page.captureScreenshot', { format: 'png', clip: { x: 100, y, width: 40, height: 20, scale: 1 } })
      const media = await ev<number[]>(
        `new Promise((ok) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let r = 0, g = 0, b = 0, n = 0; for (let k = 0; k < d.length; k += 4) { r += d[k]; g += d[k + 1]; b += d[k + 2]; n++ } ok([Math.round(r / n), Math.round(g / n), Math.round(b / n)]) }; i.src = 'data:image/png;base64,${foto.data}' })`,
      )
      confere(media.every((c) => c >= 245), `${rotulo}: gaveta fica por cima do mapa (cor sob a gaveta: rgb(${media.join(', ')}))`)
    }

    await toque(w - 10, h / 2) // toque fora da gaveta (que tem no máximo 256 px)
    confere(!(await ev<boolean>(JS.noEcra)), `${rotulo}: toque fora fecha`)

    await ev(`${JS.botao}.click()`)
    await dorme(400)
    await tecla('Escape')
    await dorme(350)
    confere(!(await ev<boolean>(JS.noEcra)), `${rotulo}: Esc fecha`)
    confere(!(await ev<boolean>(JS.rolagemTravada)), `${rotulo}: rolagem destravada ao fechar`)

    await ev(`${JS.botao}.click()`)
    await dorme(400)
    await ev(`[...document.querySelectorAll('#menu-principal nav a')].find(a => a.textContent.trim() === 'Previsão do Tempo').click()`)
    await dorme(900)
    confere((await ev<string>('location.hash')).startsWith('#/previsao'), `${rotulo}: escolher uma tela navega`)
    confere(!(await ev<boolean>(JS.noEcra)), `${rotulo}: escolher uma tela fecha a gaveta`)
  }

  for (const [w, h] of [[1024, 768], [1440, 900]] as const) {
    await tela(w, h)
    await ir('/mapa')
    const rotulo = `${papel} em ${w} px`
    confere(!(await ev<boolean>(JS.botaoVisivel)), `${rotulo}: sem botão de menu (barra lateral fixa)`)
    confere(await ev<boolean>(JS.noEcra), `${rotulo}: barra lateral visível`)
    confere(!(await ev<boolean>(JS.camada)), `${rotulo}: sem camada escura`)
  }

  // Cartão do avatar cabe na tela em 320 px.
  await tela(320, 568)
  await ir('/mapa')
  await ev(`document.querySelector('button[aria-label="Meus dados"]').click()`)
  await dorme(1200)
  const caixa = await ev<{ esq: number; dir: number } | null>(
    `(() => { const c = document.querySelector('[role=dialog][aria-label="Meus dados"]'); if (!c) return null; const r = c.getBoundingClientRect(); return { esq: r.left, dir: r.right } })()`,
  )
  confere(!!caixa && caixa.esq >= 0 && caixa.dir <= 320, `${papel} em 320 px: cartão do avatar cabe na tela (${caixa ? Math.round(caixa.esq) + '..' + Math.round(caixa.dir) : 'não abriu'})`)
}

cdp.fechar()
proc.kill()
const { rmSync } = await import('node:fs')
rmSync(perfil, { recursive: true, force: true })
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo OK')
process.exit(falhas ? 1 : 0)
