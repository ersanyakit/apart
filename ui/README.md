# INTERACTIVEOTEL UI

Next.js App Router ve React 19. Normal çalıştırma proje kökünden `go run .` komutuyla yapılır; Fiber v3 API ve Next.js SSR tek origin üzerinden sunulur.

Giriş ekranı, üst/yan menüler, takvim ve oda kartları orijinal tasarım bileşenlerini kullanır. İşletme listesi, kat planı, birim/yatak tanımları, rezervasyonlar, olanaklar ve medya işlemleri `/action` API'sine bağlıdır.

- `npm run lint`: TypeScript kontrolü
- `npm run build`: SSR üretim derlemesi
- `npm run dev:hot`: isteğe bağlı ayrı frontend süreci (:3002); normal `go run .` geliştirme akışında gerekli değildir.
- `npm run test:e2e`: ayrı PostgreSQL veritabanında tarayıcı testleri (kurulum için kök README)

`APP_ENV=development` (varsayılan) ile `go run .`, Next.js'i geliştirme modunda açar. `http://localhost:3000` üzerinde TSX/CSS kaydedildiğinde Fast Refresh çalışır; HMR WebSocket Go geliştirme proxy'sinden geçer. Üretimde `APP_ENV=production`, build + `next start` kullanır. İlk geçişte eski Go sürecini bir kez yeniden başlatın; UI değişiklikleri için yeniden başlatma gerekmez. Go çalışırken `npm run dev` (:3001) aynı portu kullanacağından ayrıca açılmamalıdır.

`src/lib/contracts.generated.json` Go sabitlerinden üretilir: proje kökünde `go generate ./constants`. JWT JavaScript tarafından okunmaz; HttpOnly cookie kullanılır.


## Ortak etkileşim stilleri

`src/index.css` renk ve etkileşim tokenlarının kaynağıdır. Yeni butonlarda `uni-control` + uygun varyantı veya `FormKit` içindeki `buttonStyle` / `secondaryStyle` kullanın. Form alanları `inputStyle` / `uni-input`, menü satırları `uni-menu-item`, kartlar `uni-card` kullanır. Etkileşimli kartlarda ayrıca `uni-card-interactive` ve klavye davranışı gerekir; statik kartlara press eklenmez.

Press: 0.98 ölçek, 100ms Uniswap fast easing; focus: tema renginde 2px outline; input focus: 3px yumuşak halo. Disabled kontroller tepki vermez; reduced-motion tercihi ölçek animasyonunu kapatır. Yerel sınıflar yerleşimi belirler; hover/press/focus değerlerini sayfa içinde tekrar tanımlamayın. Altı tema: Mavi, Pembe, Yeşil, Turuncu, Mor, Fuşya.
