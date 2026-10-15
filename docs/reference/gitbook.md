# GitBook bağlantısı — doküman yöneticisi

Bu sayfa kılavuzu yayınlayacak doküman yöneticisi içindir. Uygulamayı kullanan resepsiyon personelinin bu adımları uygulaması gerekmez.

## Hazır dosya yapısı

- Depo kökündeki `gitbook-docs.yaml`, siteyi tanımlar ve Türkçe kılavuz alanını `docs/` dizinine bağlar. Dosya adının başında nokta yoktur.
- `docs/.gitbook.yaml`, bu alanın açılış sayfasını ve içindekiler dosyasını belirler.
- `docs/README.md` kılavuzun açılış sayfasıdır.
- `docs/SUMMARY.md` bölüm ve sayfa sırasını tanımlar.
- `docs/images/` ekran görüntülerini barındırır.
- Konu dosyaları İngilizce klasör ve dosya adlarıyla tutulur; içerik Türkçedir.

Bu yapı GitBook'un [resmî Git Sync içerik yapılandırmasını](https://gitbook.com/docs/docs-as-code/git-sync/content-configuration) kullanır. Bu dosyaların hazırlanması tek başına GitBook hesabında bağlantı veya yayın oluşturmaz.

## Mevcut depoyu bağlama

1. Kılavuz dosyalarının GitHub'daki kullanmak istediğiniz dalda bulunduğunu doğrulayın.
2. GitBook'ta kılavuz için kullanacağınız alanın Git Sync bağlantısını açın.
3. İlgili GitHub deposunu ve dalı seçin. **Project directory** alanını boş bırakın veya `./` kullanın. GitBook bu dizinde `gitbook-docs.yaml` arar; dosya kılavuzu `./docs` dizinine bağlar.
4. İlk eşitlemede mevcut GitHub içeriğini GitBook'a almak istediğinizi belirtin. Mevcut bir alan kullanıyorsanız eşitlemenin hangi içeriği esas alacağını kontrol edin.
5. Önizlemede açılış sayfasını, bölüm sırasını, görselleri ve birkaç sayfalar arası bağlantıyı inceleyin.
6. Yayın adresi ve erişim ayarlarını kendi hesabınızdan belirleyip hazır olduğunuzda yayınlayın.

**“gitbook-docs.yaml does not exist on this branch” hatası:** Dosyanın bilgisayarınızda bulunması yeterli değildir; seçtiğiniz GitHub dalına commit edilip gönderilmiş olmalıdır. Depo kökünde tam olarak `gitbook-docs.yaml` bulunduğunu kontrol edin. `.gitbook-docs.yaml` ve `.gitbook.yaml` bu site dosyasının yerine geçmez. Dosya GitHub'da göründükten sonra aynı dalı seçerek yeniden deneyin.

Bu yapı için Project directory alanına `docs` yazmayın. Site dosyası depo kökündedir; `docs/.gitbook.yaml` içindeki kök de zaten eşlenmiş alanı işaret ettiği için `./` olarak kalmalıdır. Eşitleme başladıktan sonra `interactiveotel-user-guide-tr` alan anahtarını sabit tutun; başlık değişikliği için `title` alanını kullanın.

## Kılavuzu güncelleme

Yeni sayfayı ilgili konu klasörüne ekleyin ve `SUMMARY.md` içine bir kez bağlayın. Görselleri `images/` altında tutup göreli yollar kullanın. Böylece hem GitHub hem GitBook aynı dosyaları okuyabilir.

Arayüzde bir düğme veya işlem değiştiğinde ilgili adımları ve ekran görüntüsünü birlikte güncelleyin. Git Sync açıkken README dosyalarını depodan yönetin. Kullanıcı kılavuzuna uygulamada bulunmayan özellikleri veya çalışmayan canlı demo adreslerini eklemeyin.
