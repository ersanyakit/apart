"use client";
import { useMarketingI18n } from "./MarketingI18n";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { LandingSections } from "./LandingSections";
import { MarketingShell } from "./MarketingShell";
import styles from "./Landing.module.css";
import { SectionArtwork } from "./SectionArtwork";
export function Landing() {
 const { m } = useMarketingI18n();
 return <MarketingShell>
        <section className={styles.hero} aria-labelledby="hero-title">
          <picture className={styles.heroImage}><source media="(max-width: 600px)" srcSet="/images/landing/hero-mobile.avif" /><img src="/images/landing/hero.avif" alt="" width="1920" height="1280" fetchPriority="high" /></picture>
          <div className={styles.heroContent}><p className={styles.eyebrow}>{m("OTELİNİZİN YENİ ÇALIŞMA ŞEKLİ")}</p><h1 id="hero-title">{m("Az telaş.")}<br />{m("Çok misafir.")}<br /><span>{m("Her şey yerinde.")}</span></h1><p>{m("Rezervasyondan son oda kontrolüne.")}<br />{m("Otel, apart ve hostelinizin bütün işleri,")}<br className={styles.desktopBreak} />{m("tek bir ferah çalışma alanında.")}</p><a className={`${styles.button} uni-control`} href="/login">{m("Otelini yönetmeye başla")}<ArrowUpRight size={20} /></a></div>
          <div className={styles.heroFooter}><a className={`${styles.heroExplore} uni-control`} href="#features">{m("İçeriye bir göz at")}<ArrowDown size={16} /></a><span className={styles.heroCaption}>{m("Küçük detaylar. İyi işleyen bir otel.")}</span></div>
        </section>
        <section className={styles.intro} aria-label={m("Ürüne genel bakış")}><div className={styles.introOverview}><p>{m("Resepsiyonda, katta, yönetimde.")}<br /><span>{m("Herkes aynı sayfada.")}</span></p><SectionArtwork name="rooms" alt={m("Katları, odaları ve yatakları bir arada gösteren tesis görünümü")} /></div><div className={styles.introFacts}><div><strong>{m("Otel · Apart · Hostel")}</strong><span>{m("İşletmenize uygun birim ve yatak yapısı")}</span></div><div><strong>{m("Çok tesis. Tek panel.")}</strong><span>{m("Yetkiniz olan şubeler arasında geçiş")}</span></div><div><strong>{m("Masaüstünden cebinize.")}</strong><span>{m("Mobil uyumlu, kurulabilir web uygulaması")}</span></div></div></section>
        <LandingSections />
</MarketingShell>;
}
