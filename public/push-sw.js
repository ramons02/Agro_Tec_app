// Notificação push (alertas de pulverização) com o app fechado. Carregado pelo service worker do PWA
// (vite.config.ts, workbox.importScripts). Roda fora da página: sem React, sem acesso ao app.

self.addEventListener('push', (evento) => {
  let dados = {}
  try {
    dados = evento.data ? evento.data.json() : {}
  } catch {
    dados = { mensagem: evento.data ? evento.data.text() : '' }
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'AgroClima Pará', {
      body: dados.mensagem || 'Há um novo alerta.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: dados.url || '/#/pulverizacao' },
    }),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = new URL((evento.notification.data && evento.notification.data.url) || '/#/pulverizacao', self.location.origin).href
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (new URL(janela.url).origin === self.location.origin && 'focus' in janela) {
          return janela.focus().then(() => ('navigate' in janela ? janela.navigate(destino) : undefined))
        }
      }
      return self.clients.openWindow(destino)
    }),
  )
})
