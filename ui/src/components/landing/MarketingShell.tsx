"use client";
import { useMarketingI18n } from "./MarketingI18n";
import { LanguageSelect } from "./LanguageSelect";
import { LOCALES } from "../../lib/i18n/config";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import styles from "./Landing.module.css";
const links = [["/#features", "Ürünü keşfet"], ["/pricing", "Fiyatlar"], ["/screenshots", "Ekran görüntüleri"], ["/contact", "İletişim"]];
export function MarketingShell({children}: {children: ReactNode}) {
 const { m, locale } = useMarketingI18n();
 const [menuOpen, setMenuOpen] = useState(false);
 const pathname = usePathname();
 return <div className={styles.page} id="top" lang={locale} dir={LOCALES[locale].direction}>
 <a className={styles.skip} href="#content">{m("İçeriğe geç")}</a>
      <header className={styles.header}>
        <a className={`${styles.logo} uni-control`} href="/" aria-label={m("Interactiveotel ana sayfa")}><span className={styles.logoMark}>i.</span>interactiveotel<span className={styles.logoDot}>®</span></a>
        <nav aria-label={m("Ana gezinme")} className={styles.desktopNav}>
          {links.map(([href, label]) => <a className="uni-control" key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{m(label)}</a>)}
        </nav>
        <div className={styles.navActions}><LanguageSelect/><a className={`${styles.button} ${styles.smallButton} uni-control`} href="/login">{m("Uygulamayı aç")}<ArrowUpRight size={17} /></a><button className={`${styles.menuButton} nav-icon-button`} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="landing-menu" aria-label={m(menuOpen ? "Menüyü kapat" : "Menüyü aç")}>{menuOpen ? <X /> : <Menu />}</button></div>
        {menuOpen && <nav id="landing-menu" className={styles.mobileNav} aria-label={m("Mobil gezinme")}>{links.map(([href,label]) => <a className="uni-control" key={href} href={href} onClick={() => setMenuOpen(false)}>{m(label)}</a>)}<a className={`${styles.button} uni-control`} href="/login">{m("Uygulamayı aç")}<ArrowUpRight size={17}/></a></nav>}
      </header>
<main id="content">{children}</main>
      <footer className={styles.footer}><div><a className={`${styles.logo} uni-control`} href="/"><span className={styles.logoMark}>i.</span>interactiveotel</a><p>{m("Misafirlerinize yer açın.")}<br />{m("İşlerinizi bize bırakın.")}</p></div><nav aria-label={m("Alt gezinme")}><a className="uni-control" href="/#features">{m("Ürünü keşfet")}</a><a className="uni-control" href="/#all-features">{m("Tüm özellikler")}</a><a className="uni-control" href="/#how-it-works">{m("Nasıl çalışır?")}</a><a className="uni-control" href="/#faq">{m("Sık sorulan sorular")}</a>{links.slice(1).map(([href,label]) => <a className="uni-control" href={href} key={href}>{m(label)}</a>)}<a className="uni-control" href="/login">{m("Giriş yap ↗")}</a></nav><div className={styles.footerBottom}><span>© 2026 Interactiveotel</span><span>{m("Otel, apart ve hostel yönetimi.")}</span><a className="uni-control" href="#top">{m("Başa dön ↑")}</a></div></footer></div>;
}
