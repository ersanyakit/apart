import { ArrowDown, ArrowUpRight } from "lucide-react";
import { LandingSections } from "./LandingSections";
import { MarketingShell } from "./MarketingShell";
import styles from "./Landing.module.css";
import { SectionArtwork } from "./SectionArtwork";
export function Landing() {
 return <MarketingShell>
        <section className={styles.hero} aria-labelledby="hero-title">
          <picture className={styles.heroImage}><source media="(max-width: 600px)" srcSet="/images/landing/hero-mobile.avif" /><img src="/images/landing/hero.avif" alt="" width="1920" height="1280" fetchPriority="high" /></picture>
          <div className={styles.heroContent}><p className={styles.eyebrow}>OTELİNİZİN YENİ ÇALIŞMA ŞEKLİ</p><h1 id="hero-title">Az telaş.<br />Çok misafir.<br /><span>Her şey yerinde.</span></h1><p>Rezervasyondan son oda kontrolüne.<br />Otel, apart ve hostelinizin bütün işleri,<br className={styles.desktopBreak} /> tek bir ferah çalışma alanında.</p><a className={`${styles.button} uni-control`} href="/login">Otelini yönetmeye başla <ArrowUpRight size={20} /></a></div>
          <a className={`${styles.heroExplore} uni-control`} href="#ozellikler">İçeriye bir göz at <ArrowDown size={16} /></a><span className={styles.heroCaption}>Küçük detaylar. İyi işleyen bir otel.</span>
        </section>
        <section className={styles.intro} aria-label="Ürüne genel bakış"><div className={styles.introOverview}><p>Resepsiyonda, katta, yönetimde.<br /><span>Herkes aynı sayfada.</span></p><SectionArtwork name="rooms" alt="Katları, odaları ve yatakları bir arada gösteren tesis görünümü" /></div><div className={styles.introFacts}><div><strong>Otel · Apart · Hostel</strong><span>İşletmenize uygun birim ve yatak yapısı</span></div><div><strong>Çok tesis. Tek panel.</strong><span>Yetkiniz olan şubeler arasında geçiş</span></div><div><strong>Masaüstünden cebinize.</strong><span>Mobil uyumlu, kurulabilir web uygulaması</span></div></div></section>
        <LandingSections />
</MarketingShell>;
}
