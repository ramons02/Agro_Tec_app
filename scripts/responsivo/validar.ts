// Validação de layout responsivo (spec 027). Uso:
//   bun scripts/responsivo/validar.ts --saida <pasta> [--app http://localhost:5173] [--api http://localhost:8080] [--contas contas.json] [--so-publicas]
// `contas.json` fica fora do repositório: { "ADMIN_MASTER": {"email": "...", "senha": "..."}, "GESTOR_TECNOLOGIA": {...}, "PRODUTOR_RURAL": {...}, "AGRONOMO": {...} }
// O app usa HashRouter: as rotas são `/#/rota`. Sem dependência nova: Chrome headless conduzido por CDP (WebSocket do Bun).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dorme, iniciarChrome, login, type Papel } from './comum.ts'

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
// --extras: acrescenta a largura de zoom de 200% (1280 px ampliados = 640 px) e a passada com a rede offline no mapa (FR-006 e FR-015).
const EXTRAS = args.includes('--extras')
const FILTRO_ROTAS = opt('rotas')?.split(',')
const FILTRO_LARGURAS = opt('larguras')?.split(',')

const LARGURAS = [
  { nome: '320', w: 320, h: 568 },
  { nome: '320-paisagem', w: 568, h: 320 },
  { nome: '360', w: 360, h: 740 },
  { nome: '360-paisagem', w: 740, h: 360 },
  { nome: '768', w: 768, h: 1024 },
  { nome: '1024', w: 1024, h: 768 },
  { nome: '1440', w: 1440, h: 900 },
]

const LARGURAS_EXTRAS = [{ nome: '640-zoom200', w: 640, h: 450 }]

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

// Roda dentro da página: mede rolagem horizontal, alvos de toque e elementos fora da janela.
const MEDIR = `(() => {
  const toque = matchMedia('(pointer: coarse)').matches
  const vw = document.documentElement.clientWidth
  const visivel = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'
  }
  // Gaveta fechada (inert) e tudo que mora dentro de um elemento fixo (gaveta, camada escura, diálogos) fica fora da medida.
  const inerte = (el) => !!el.closest('[inert]')
  const emFixo = (el) => { for (let p = el; p; p = p.parentElement) if (getComputedStyle(p).position === 'fixed') return true; return false }
  const descreve = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' "' + (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 30) + '"')
  const alvos = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab]')]
    .filter(visivel)
    .filter((el) => !inerte(el))
    .filter((el) => !el.closest('.leaflet-tile-pane, .leaflet-attribution-flag'))
    // Exceções combinadas na spec (FR-014): atribuição legal do mapa e link dentro de uma frase de texto.
    .filter((el) => !el.closest('.leaflet-control-attribution'))
    .filter((el) => !(el.tagName === 'A' && el.parentElement && [...el.parentElement.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== '')))
    // Caixa de marcar e botão de rádio: o alvo de toque é o rótulo que os envolve, não o quadradinho.
    .map((el) => ({ el, r: (/^(checkbox|radio)$/.test(el.type || '') && el.closest('label') ? el.closest('label') : el).getBoundingClientRect() }))
    .filter(({ r }) => toque && (r.width < 43.5 || r.height < 43.5))
    .map(({ el, r }) => descreve(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height))
  // O app rola dentro do <main>, não no documento: conteúdo largo demais ali não aparece em scrollWidth do documento.
  const interna = [...document.querySelectorAll('body *')]
    .filter((el) => !el.closest('.leaflet-container') && !inerte(el))
    .filter((el) => { const o = getComputedStyle(el).overflowX; return (o === 'auto' || o === 'scroll') && el.scrollWidth > el.clientWidth + 1 })
    .slice(0, 5)
    .map((el) => descreve(el) + ' ' + el.scrollWidth + '>' + el.clientWidth)
  const fora = [...document.querySelectorAll('body *')]
    .filter(visivel)
    .filter((el) => !inerte(el) && !emFixo(el) && !el.closest('.leaflet-container, [aria-hidden=true]'))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1 })
    .slice(0, 5)
    .map((el) => descreve(el))
  return {
    rota: location.hash.slice(1),
    texto: document.body.innerText.replace(/\s+/g, ' ').slice(0, 90),
    token: !!localStorage.getItem('agroclima:token'),
    larguraJanela: vw,
    rolagemHorizontal: document.documentElement.scrollWidth > vw + 1,
    larguraConteudo: document.documentElement.scrollWidth,
    alvosPequenos: alvos.length,
    exemplosAlvos: alvos.slice(0, 5),
    elementosFora: fora,
    rolagemInterna: interna,
  }
})()`

// Roda dentro da página na passada offline: o indicador está no cabeçalho e não pode cobrir o menu nem o avatar.
const MEDIR_OFFLINE = `(() => {
  const cab = document.querySelector('header')
  const ind = [...document.querySelectorAll('header span')].find((s) => /offline/i.test(s.textContent || ''))
  const menu = document.querySelector('button[aria-controls="menu-principal"]')
  const avatar = document.querySelector('button[aria-label="Meus dados"]')
  const caixa = (el) => (el ? el.getBoundingClientRect() : null)
  const cruza = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  const i = caixa(ind)
  return {
    indicador: !!ind && !!i && i.width > 0,
    cabe: !!i && i.left >= 0 && i.right <= document.documentElement.clientWidth,
    sobrepoe: cruza(i, caixa(menu)) || cruza(i, caixa(avatar)),
    cabecalhoRola: !!cab && cab.scrollWidth > cab.clientWidth + 1,
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
  comToken?: boolean
  texto?: string
  chamadasApi?: string[]
  alvosPequenos: number
  exemplosAlvos: string[]
  elementosFora: string[]
  rolagemInterna: string[]
  captura: string
  erro?: string
}

async function main() {
  mkdirSync(SAIDA, { recursive: true })
  const { proc, perfil, cdp } = await iniciarChrome()
  const resultados: Resultado[] = []

  const contas: Partial<Record<Papel, { email: string; senha: string }>> = ARQUIVO_CONTAS
    ? JSON.parse(readFileSync(ARQUIVO_CONTAS, 'utf8'))
    : {}

  await cdp.enviar('Page.enable')
  await cdp.enviar('Runtime.enable')
  await cdp.enviar('Network.enable')
  let chamadasApi: string[] = []
  cdp.eventos.push((m) => {
    if (m.method === 'Network.responseReceived' && String(m.params.response.url).includes('/api/')) {
      chamadasApi.push(`${m.params.response.status} ${new URL(m.params.response.url).pathname}`)
    }
  })

  async function medir(perfil: string, rota: string) {
    for (const l of [...LARGURAS, ...(EXTRAS ? LARGURAS_EXTRAS : [])].filter((x) => !FILTRO_LARGURAS || FILTRO_LARGURAS.includes(x.nome))) {
      const movel = l.w < 1024
      await cdp.enviar('Emulation.setDeviceMetricsOverride', {
        width: l.w, height: l.h, deviceScaleFactor: movel ? 2 : 1, mobile: l.w < 768,
      })
      await cdp.enviar('Emulation.setTouchEmulationEnabled', movel ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
      await cdp.enviar('Emulation.setEmulatedMedia', {
        features: [{ name: 'pointer', value: movel ? 'coarse' : 'fine' }, { name: 'hover', value: movel ? 'none' : 'hover' }],
      })
      chamadasApi = []
      await cdp.enviar('Page.navigate', { url: `${APP}/?r=${Date.now()}#${rota}` })
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
      // Tela interna que cai no /login quer dizer sessão inválida (API errada no app, conta recusada): a medida seria do login.
      const redirecionou = perfil !== 'publico' && medida && medida.rota !== rota
      if (redirecionou && !erro) erro = `redirecionou para ${medida.rota}: sessão não valeu (o app está usando a mesma API da conta de teste?)`
      resultados.push({
        perfil, tela: rota, largura: l.nome,
        rolagemHorizontal: medida?.rolagemHorizontal ?? false,
        larguraConteudo: medida?.larguraConteudo ?? 0,
        larguraJanela: medida?.larguraJanela ?? l.w,
        rotaFinal: medida?.rota ?? '',
        comToken: medida?.token,
        texto: medida?.texto,
        chamadasApi: [...chamadasApi],
        alvosPequenos: medida?.alvosPequenos ?? 0,
        exemplosAlvos: medida?.exemplosAlvos ?? [],
        elementosFora: medida?.elementosFora ?? [],
        rolagemInterna: medida?.rolagemInterna ?? [],
        captura: nome, erro,
      })
      console.log(`${perfil.padEnd(18)} ${rota.padEnd(15)} ${l.nome.padEnd(13)} ->${(medida?.rota ?? '?').padEnd(14)} rolagem=${medida?.rolagemHorizontal ? 'SIM' : 'nao'} interna=${medida?.rolagemInterna?.length ?? '?'} alvos<44=${medida?.alvosPequenos ?? '?'}${erro ? '  ERRO: ' + erro.slice(0, 60) : ''}`)
      const detalhe = [...(medida?.elementosFora ?? []).map((x: string) => 'fora: ' + x), ...(medida?.rolagemInterna ?? []).map((x: string) => 'interna: ' + x), ...(medida?.exemplosAlvos ?? []).slice(0, 2).map((x: string) => 'alvo: ' + x)]
      if (detalhe.length) console.log('    ' + detalhe.slice(0, 3).join(' | '))
    }

    // Passada offline (FR-006): com a rede caída o indicador de modo offline aparece no cabeçalho e cabe sem cobrir o botão
    // do menu nem o avatar. Só no mapa e só nos celulares, onde o cabeçalho é mais apertado.
    if (EXTRAS && perfil !== 'publico' && rota === '/mapa') {
      for (const l of LARGURAS.filter((x) => (x.nome === '320' || x.nome === '360') && (!FILTRO_LARGURAS || FILTRO_LARGURAS.includes(x.nome)))) {
        await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: l.w, height: l.h, deviceScaleFactor: 2, mobile: true })
        await cdp.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
        await cdp.enviar('Page.navigate', { url: `${APP}/?r=${Date.now()}#${rota}` })
        await dorme(2500)
        await cdp.enviar('Network.enable')
        await cdp.enviar('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
        await dorme(800)
        const r = await cdp.enviar('Runtime.evaluate', { expression: MEDIR_OFFLINE, returnByValue: true })
        const o = r.result.value as { indicador: boolean; cabe: boolean; sobrepoe: boolean; cabecalhoRola: boolean }
        const nome = `${perfil}${rota.replace(/\//g, '_')}-${l.nome}-offline.jpg`
        const shot = await cdp.enviar('Page.captureScreenshot', { format: 'jpeg', quality: 70 })
        writeFileSync(join(SAIDA, nome), Buffer.from(shot.data, 'base64'))
        await cdp.enviar('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
        const problema = !o.indicador ? 'indicador de modo offline não apareceu' : !o.cabe ? 'indicador passa da borda da tela' : o.sobrepoe ? 'indicador cobre o botão do menu ou o avatar' : o.cabecalhoRola ? 'cabeçalho passa da largura' : undefined
        resultados.push({
          perfil, tela: rota, largura: `${l.nome}-offline`, rolagemHorizontal: false, larguraConteudo: l.w, larguraJanela: l.w,
          rotaFinal: rota, alvosPequenos: 0, exemplosAlvos: [], elementosFora: [], rolagemInterna: [], captura: nome, erro: problema,
        } as Resultado)
        console.log(`${perfil.padEnd(18)} ${rota.padEnd(15)} ${(l.nome + '-offline').padEnd(13)} indicador=${o.indicador ? 'sim' : 'NAO'} cabe=${o.cabe ? 'sim' : 'NAO'}${problema ? '  ERRO: ' + problema : ''}`)
      }
    }
  }

  // Telas públicas, sem sessão.
  await cdp.enviar('Page.navigate', { url: `${APP}/#/login` })
  await dorme(1500)
  await cdp.enviar('Runtime.evaluate', { expression: 'localStorage.clear(); sessionStorage.clear()' })
  for (const rota of TELAS_PUBLICAS.filter((r) => !FILTRO_ROTAS || FILTRO_ROTAS.includes(r))) await medir('publico', rota)

  if (!SO_PUBLICAS) {
    for (const papel of Object.keys(contas) as Papel[]) {
      const sessao = await login(API, papel, contas[papel]!)
      await cdp.enviar('Page.navigate', { url: `${APP}/#/login` })
      await dorme(1000)
      await cdp.enviar('Runtime.evaluate', {
        expression: `localStorage.setItem('agroclima:token', ${JSON.stringify(sessao.token)}); localStorage.setItem('agroclima:papel', ${JSON.stringify(sessao.papel)})`,
      })
      for (const t of TELAS_INTERNAS.filter((x) => x.papeis.includes(papel) && (!FILTRO_ROTAS || FILTRO_ROTAS.includes(x.rota)))) await medir(papel, t.rota)
    }
  }

  cdp.fechar()
  proc.kill()
  rmSync(perfil, { recursive: true, force: true })

  writeFileSync(join(SAIDA, 'relatorio.json'), JSON.stringify(resultados, null, 2))
  const falhas = resultados.filter((r) => r.rolagemHorizontal || (r.rolagemInterna.length > 0 && r.larguraJanela < 1024) || r.alvosPequenos > 0 || r.elementosFora.length > 0 || r.erro)
  const linhas = [
    '# Relatório de validação responsiva',
    '',
    `Medições: ${resultados.length}. Com falha: ${falhas.length}.`,
    '',
    '| Perfil | Tela | Largura | Rolagem horizontal | Rolagem interna | Alvos < 44 px | Fora da janela | Erro |',
    '|---|---|---|---|---|---|---|---|',
    ...resultados.map(
      (r) => `| ${r.perfil} | ${r.tela} | ${r.largura} | ${r.rolagemHorizontal ? `SIM (${r.larguraConteudo} > ${r.larguraJanela})` : 'não'} | ${r.rolagemInterna.length ? `SIM (${r.rolagemInterna.length})` : 'não'} | ${r.alvosPequenos} | ${r.elementosFora.length} | ${r.erro ? 'SIM' : ''} |`,
    ),
  ]
  writeFileSync(join(SAIDA, 'relatorio.md'), linhas.join('\n') + '\n')
  console.log(`\n${resultados.length} medições, ${falhas.length} com falha. Relatório em ${join(SAIDA, 'relatorio.md')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
