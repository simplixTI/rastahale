// ============================================================
//  Service Worker — versão mínima e segura (rastahale-v5)
//
//  As versões anteriores usavam cache-first para HTML/JS/CSS. Isso servia o
//  "shell" e os chunks ANTIGOS após um deploy novo, deixando a página lenta e
//  sem abrir no F5 — só voltava com "Limpar dados do site". Afetava QUALQUER
//  visitante que já tivesse aberto o site antes (não é problema de 1 máquina).
//
//  Este SW:
//   • NÃO intercepta requisições (não chama respondWith) → o navegador usa a
//     rede + cache HTTP normal. Assets com hash da Vite já vêm com headers
//     "immutable" do host, então o cache do próprio browser cuida da perf.
//   • Apaga todos os caches antigos ao ativar → cura quem tinha o SW velho.
//   • skipWaiting + clients.claim → assume o controle na hora; a partir daí
//     nenhuma requisição é interceptada, então o próximo carregamento vem
//     limpo da rede (o app ainda dispara um reload único via src/main.tsx).
// ============================================================

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Handler de fetch vazio (mantém o app instalável como PWA), mas SEM
// respondWith: cada requisição é tratada normalmente pelo navegador.
self.addEventListener("fetch", () => {});

// ============================================================
//  Push (FCM web) — fundido neste mesmo SW de propósito.
//
//  O FCM web sugere um "firebase-messaging-sw.js" separado, mas dois service
//  workers no mesmo escopo ("/") disputam o controle da página e o FCM só
//  entrega o push no registration usado no getToken(). Em vez disso, o app
//  (src/lib/push.ts) chama getToken() com serviceWorkerRegistration apontando
//  para ESTE worker, e aqui tratamos o evento "push" diretamente.
//
//  Vantagem: o SW não precisa das credenciais do Firebase (que vivem nas env
//  vars da página, não em arquivo estático) nem de importScripts de CDN — ele
//  só lê o payload e exibe a notificação do sistema.
//
//  Payload esperado (FCM HTTP v1, webpush): JSON com
//  { notification: { title, body, ... }, data: {...} }.
// ============================================================
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: "RastaHale Academy", body: event.data.text() } };
  }
  const notification = payload.notification || {};
  const title = notification.title || "RastaHale Academy";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: notification.body || "",
      icon: "/web-app-manifest-192x192.png",
      badge: "/web-app-manifest-192x192.png",
      data: payload.data || {},
    })
  );
});

// Toque na notificação: foca uma aba já aberta do app ou abre uma nova.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
