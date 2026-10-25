// Cenário de privacidade do cache offline (HU-16): o que um usuário carregou NÃO pode aparecer para o próximo usuário do
// mesmo aparelho, nem quando a API cai. Uso:
//   bun scripts/seguranca/cache-por-usuario.ts --contas contas.json [--app http://localhost:5173] [--api http://localhost:8080]
// Precisa de dois usuários de grupos diferentes: o primeiro (ADMIN_MASTER) com talhões, o segundo (GESTOR_TECNOLOGIA) de
// um grupo SEM os talhões do primeiro.
import { readFileSync } from 'node:fs'
import { rmSync } from 'node:fs'
import { dorme, iniciarChrome } from '../responsivo/comum.ts'

const args = process.argv.slice(2)
const opt = (nome: string, padrao?: string) => {
  const i = args.indexOf(`--${nome}`)
  return i >= 0 ? args[i + 1] : padrao
}
const APP = opt('app', 'http://localhost:5173')!
const API = opt('api', 'http://localhost:8080')!
const contas = JSON.parse(readFileSync(opt('contas')!, 'utf8'))
const A = contas.ADMIN_MASTER
const B = contas.GESTOR_TECNOLOGIA

let falhas = 0
const confere = (ok: boolean, msg: string) => {
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`)
  if (!ok) falhas++
}

const { proc, perfil, cdp } = await iniciarChrome()
await cdp.enviar('Page.enable')
await cdp.enviar('Runtime.enable')
await cdp.enviar('Network.enable')
const ev = async <T = any>(x: string): Promise<T> =>
  (await cdp.enviar('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result.value
await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
const ir = async (rota: string) => {
  await cdp.enviar('Page.navigate', { url: `${APP}/?r=${Date.now()}#${rota}` })
  await dorme(2500)
}
const texto = () => ev<string>('document.body.innerText')
const preencher = (seletor: string, valor: string) =>
  ev(`(() => { const el = document.querySelector(${JSON.stringify(seletor)}); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(valor)}); el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
const clicarTexto = (t: string) =>
  ev(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(t)}); if (b) b.click(); return !!b })()`)
const bancoLocal = () =>
  ev<{ cache: string[]; acoes: number }>(`new Promise((ok) => { const r = indexedDB.open('agroclima-offline'); r.onerror = () => ok({ cache: [], acoes: 0 }); r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('cacheDados')) return ok({ cache: [], acoes: 0 }); const t = d.transaction(['cacheDados', 'acoesPendentes'], 'readonly'); const c = t.objectStore('cacheDados').getAllKeys(); const a = t.objectStore('acoesPendentes').count(); t.oncomplete = () => ok({ cache: c.result.map(String), acoes: a.result }) } })`)

// 1) Usuário A entra e carrega o mapa: o app guarda o cache dele no aparelho.
await ir('/login')
await ev('localStorage.clear()')
await ir('/login')
await preencher('input[type=email]', A.email)
await preencher('input[type=password]', A.senha)
await clicarTexto('Entrar')
await dorme(2500)
await ir('/propriedades')
const aVe = await texto()
const nomesDeA = [...aVe.matchAll(/Fazenda [A-Za-zÀ-ú ]+/g)].map((m) => m[0].trim())
confere(nomesDeA.length > 0, `usuário A (Master) vê propriedades (${[...new Set(nomesDeA)].join(', ')})`)
const antes = await bancoLocal()
confere(antes.cache.length > 0, `o cache offline guardou os dados do usuário A (${antes.cache.join(', ')})`)

// 1b) O modo offline do próprio A segue funcionando: com as chamadas de dados falhando, A ainda vê o que já carregou.
await cdp.enviar('Network.setBlockedURLs', {
  urls: [`${API}/api/v1/propriedades*`, `${API}/api/v1/talhoes*`, `${API}/api/v1/dashboard*`],
})
await ir('/propriedades')
const aOffline = await texto()
confere(nomesDeA.every((n) => aOffline.includes(n)), 'usuário A, sem rede para os dados, ainda vê o que carregou (cache offline dele)')
await cdp.enviar('Network.setBlockedURLs', { urls: [] })
await ir('/propriedades')

// 2) A sai pelo menu do avatar.
await ev(`document.querySelector('button[aria-label="Meus dados"]').click()`)
await dorme(800)
await clicarTexto('Sair')
await dorme(1500)
const depoisDeSair = await bancoLocal()
confere(depoisDeSair.cache.length === 0, `sair apaga o cache offline do aparelho (restou: ${depoisDeSair.cache.join(', ') || 'nada'})`)

// 3) B entra e, logo depois, a API fica inalcançável: o app cai para o cache offline.
// O login do B funciona, mas as chamadas de dados falham (rede ruim, servidor acordando): é a primeira carga dele,
// então o app cai para o cache que estiver no aparelho.
await ir('/login')
await cdp.enviar('Network.setBlockedURLs', {
  urls: [`${API}/api/v1/propriedades*`, `${API}/api/v1/talhoes*`, `${API}/api/v1/dashboard*`],
})
await preencher('input[type=email]', B.email)
await preencher('input[type=password]', B.senha)
await clicarTexto('Entrar')
await dorme(3500)
await ir('/propriedades')
const bVe = await texto()
const vazou = nomesDeA.filter((n) => bVe.includes(n))
confere(vazou.length === 0, `usuário B, com a API fora do ar, NÃO vê os dados do usuário A (vazou: ${vazou.join(', ') || 'nada'})`)
await cdp.enviar('Network.setBlockedURLs', { urls: [] })

cdp.fechar()
proc.kill()
rmSync(perfil, { recursive: true, force: true })
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo OK')
process.exit(falhas ? 1 : 0)
