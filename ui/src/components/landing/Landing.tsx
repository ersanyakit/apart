"use client";

import { useState } from "react";
import { ArrowDown, ArrowUpRight, Menu, X } from "lucide-react";
import { LandingSections } from "./LandingSections";
import styles from "./Landing.module.css";

export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={styles.page} id="top">
      <a className={styles.skip} href="#icerik">İçeriğe geç</a>
      <header className={styles.header}>
        <a className={`${styles.logo} uni-control`} href="#top" aria-label="Interactiveotel ana sayfa"><span className={styles.logoMark}>i.</span>interactiveotel<span className={styles.logoDot}>®</span></a>
        <nav aria-label="Ana gezinme" className={styles.desktopNav}>
          <a className="uni-control" href="#ozellikler">Ürünü keşfet</a><a className="uni-control" href="#tum-ozellikler">Tüm özellikler</a><a className="uni-control" href="#sss">Sorular & cevaplar</a>
        </nav>
        <div className={styles.navActions}><a className={`${styles.button} ${styles.smallButton} uni-control`} href="/login">Uygulamayı aç <ArrowUpRight size={17} /></a><button className={`${styles.menuButton} nav-icon-button`} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="landing-menu" aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}>{menuOpen ? <X /> : <Menu />}</button></div>
        {menuOpen && <nav id="landing-menu" className={styles.mobileNav} aria-label="Mobil gezinme">{[["#ozellikler", "Ürünü keşfet"], ["#tum-ozellikler", "Tüm özellikler"], ["#sss", "Sorular & cevaplar"]].map(([href,label]) => <a className="uni-control" key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>}
      </header>
      <main id="icerik">
        <section className={styles.hero} aria-labelledby="hero-title">
          <picture className={styles.heroImage}><source media="(max-width: 600px)" srcSet="/images/landing/hero-mobile.avif" /><img src="/images/landing/hero.avif" alt="" width="1920" height="1280" fetchPriority="high" /></picture>
          <div className={styles.heroContent}><p className={styles.eyebrow}>OTELİNİZİN YENİ ÇALIŞMA ŞEKLİ</p><h1 id="hero-title">Az telaş.<br />Çok misafir.<br /><span>Her şey yerinde.</span></h1><p>Rezervasyondan son oda kontrolüne.<br />Otel, apart ve hostelinizin bütün işleri,<br className={styles.desktopBreak} /> tek bir ferah çalışma alanında.</p><a className={`${styles.button} uni-control`} href="/login">Otelini yönetmeye başla <ArrowUpRight size={20} /></a></div>
          <a className={`${styles.heroExplore} uni-control`} href="#ozellikler">İçeriye bir göz at <ArrowDown size={16} /></a><span className={styles.heroCaption}>Küçük detaylar. İyi işleyen bir otel.</span>
        </section>
        <section className={styles.intro} aria-label="Ürüne genel bakış"><p>Resepsiyonda, katta, yönetimde.<br /><span>Herkes aynı sayfada.</span></p><div className={styles.introFacts}><div><strong>Otel · Apart · Hostel</strong><span>İşletmenize uygun birim ve yatak yapısı</span></div><div><strong>Çok tesis. Tek panel.</strong><span>Yetkiniz olan şubeler arasında geçiş</span></div><div><strong>Masaüstünden cebinize.</strong><span>Mobil uyumlu, kurulabilir web uygulaması</span></div></div></section>
        <LandingSections />
      </main>
      <footer className={styles.footer}><div><a className={`${styles.logo} uni-control`} href="#top"><span className={styles.logoMark}>i.</span>interactiveotel</a><p>Misafirlerinize yer açın.<br />İşlerinizi bize bırakın.</p></div><nav aria-label="Alt gezinme"><a className="uni-control" href="#ozellikler">Ürünü keşfet</a><a className="uni-control" href="#tum-ozellikler">Tüm özellikler</a><a className="uni-control" href="#nasil-calisir">Nasıl çalışır?</a><a className="uni-control" href="#sss">Sık sorulan sorular</a><a className="uni-control" href="/login">Giriş yap ↗</a></nav><div className={styles.footerBottom}><span>© 2026 Interactiveotel</span><span>Otel, apart ve hostel yönetimi.</span><a className="uni-control" href="#top">Başa dön ↑</a></div></footer>
    </div>
  );
}
