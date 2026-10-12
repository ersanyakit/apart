# INTERACTIVEOTEL UI

Next.js App Router ve React 19. Normal çalıştırma proje kökünden `go run .` komutuyla yapılır; Fiber v3 API ve Next.js SSR tek origin üzerinden sunulur.

Giriş ekranı, üst/yan menüler, takvim ve oda kartları orijinal tasarım bileşenlerini kullanır. İşletme listesi, kat planı, birim/yatak tanımları, rezervasyonlar, olanaklar ve medya işlemleri `/action` API'sine bağlıdır.

- `npm run lint`: TypeScript kontrolü
- `npm run build`: SSR üretim derlemesi
- `npm run test:e2e`: ayrı PostgreSQL veritabanında tarayıcı testleri (kurulum için kök README)

`src/lib/contracts.generated.json` Go sabitlerinden üretilir: proje kökünde `go generate ./constants`. JWT JavaScript tarafından okunmaz; HttpOnly cookie kullanılır.
