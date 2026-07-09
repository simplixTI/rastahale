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
