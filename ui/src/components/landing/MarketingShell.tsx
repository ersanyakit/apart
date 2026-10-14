"use client";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import styles from "./Landing.module.css";
const links = [["/#ozellikler", "Ürünü keşfet"], ["/pricing", "Fiyatlar"], ["/screenshots", "Ekran görüntüleri"], ["/contact", "İletişim"]];
export function MarketingShell({children}: {children: ReactNode}) {
 const [menuOpen, setMenuOpen] = useState(false);
 const pathname = usePathname();
 return <div className={styles.page} id="top">
 <a className={styles.skip} href="#icerik">İçeriğe geç</a>
      <header className={styles.header}>
        <a className={`${styles.logo} uni-control`} href="/" aria-label="Interactiveotel ana sayfa"><span className={styles.logoMark}>i.</span>interactiveotel<span className={styles.logoDot}>®</span></a>
        <nav aria-label="Ana gezinme" className={styles.desktopNav}>
          {links.map(([href, label]) => <a className="uni-control" key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</a>)}
        </nav>
        <div className={styles.navActions}><a className={`${styles.button} ${styles.smallButton} uni-control`} href="/login">Uygulamayı aç <ArrowUpRight size={17} /></a><button className={`${styles.menuButton} nav-icon-button`} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="landing-menu" aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}>{menuOpen ? <X /> : <Menu />}</button></div>
        {menuOpen && <nav id="landing-menu" className={styles.mobileNav} aria-label="Mobil gezinme">{links.map(([href,label]) => <a className="uni-control" key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>}
      </header>
<main id="icerik">{children}</main>
      <footer className={styles.footer}><div><a className={`${styles.logo} uni-control`} href="/"><span className={styles.logoMark}>i.</span>interactiveotel</a><p>Misafirlerinize yer açın.<br />İşlerinizi bize bırakın.</p></div><nav aria-label="Alt gezinme"><a className="uni-control" href="/#ozellikler">Ürünü keşfet</a><a className="uni-control" href="/#tum-ozellikler">Tüm özellikler</a><a className="uni-control" href="/#nasil-calisir">Nasıl çalışır?</a><a className="uni-control" href="/#sss">Sık sorulan sorular</a>{links.slice(1).map(([href,label]) => <a className="uni-control" href={href} key={href}>{label}</a>)}<a className="uni-control" href="/login">Giriş yap ↗</a></nav><div className={styles.footerBottom}><span>© 2026 Interactiveotel</span><span>Otel, apart ve hostel yönetimi.</span><a className="uni-control" href="#top">Başa dön ↑</a></div></footer></div>;
}
