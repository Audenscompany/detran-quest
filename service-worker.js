// ═══════════════════════════════════════════════════════════════
// DETRAN Quest — Service Worker
// Versão: sincronize com GAME_VERSION do index.html
// ═══════════════════════════════════════════════════════════════

const CACHE_VERSION = '7.2.3';
const CACHE_NAME    = 'detran-quest-v' + CACHE_VERSION;

// ──────────────────────────────────────────────
// INSTALL — cacheia o app e ativa imediatamente
// (skipWaiting garante que atualizações tomem
//  controle sem precisar fechar o app no iOS)
// ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['./index.html', './']))
      .then(() => self.skipWaiting()) // assume controle sem esperar fechar o app
  );
});

// ──────────────────────────────────────────────
// ACTIVATE — apaga caches de versões antigas
// clients.claim() faz o novo SW assumir as
// abas abertas sem precisar recarregar
// ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ──────────────────────────────────────────────
// FETCH — estratégia por tipo de recurso:
//   • Navegação (HTML): rede primeiro, fallback cache
//     → garante que o app sempre pega a versão nova
//     quando online (chave para o home screen atualizar)
//   • Outros (fonts, etc.): cache primeiro, fallback rede
// ──────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Ignora requests não-GET e cross-origin (fonts do Google, etc.)
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    // HTML — rede primeiro: atualiza sempre que online
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // Salva cópia fresca no cache
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match('./index.html')) // offline: usa cache
    );
  } else {
    // Outros assets — cache primeiro
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
  }
});

// ──────────────────────────────────────────────
// MESSAGE — recebe {type:'SKIP_WAITING'} do app
// (botão "Atualizar agora" do banner)
// ──────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
