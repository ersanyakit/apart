"use client";
import { useMarketingI18n } from "./MarketingI18n";
import { Mail, Phone, MapPin } from 'lucide-react';
import { MarketingShell } from './MarketingShell';
import { PageIntro } from './PageIntro';
import { ContactForm } from './ContactForm';
import styles from './MarketingPages.module.css';
export function ContactContent({email,phone,address,subjectCode}: {email:string;phone:string;address:string;subjectCode:string}) {
 const { m } = useMarketingI18n();
 const subjects: Record<string, string> = {
   'hotel-pricing': 'Otel için fiyat bilgisi',
   'aparthotel-pricing': 'Apart için fiyat bilgisi',
   'guesthouse-pricing': 'Pansiyon için fiyat bilgisi',
   'vacation-rental-pricing': 'Günlük Kiralık Daire için fiyat bilgisi',
   'hostel-pricing': 'Hostel için fiyat bilgisi',
 };
 const subject = typeof subjectCode === 'string' ? subjects[subjectCode] || subjectCode : '';
 return <MarketingShell><PageIntro eyebrow={m("İLETİŞİM")} title={m("İyi bir başlangıç, bir merhabayla.")} description={m("İster yeni bir tesis kuruyor olun, ister günlük işlerinizi daha düzenli yürütmek isteyin. Sorularınıza birlikte bakalım.")} image="contact" alt={m("Resepsiyon telefonu, açık mektup ve otel zili")}/><section className={styles.content}><div className={styles.contactGrid}><div><h2>{m("Neyi konuşalım?")}</h2><p>{m("Ürünün işletmenize uygunluğu, fiyat bilgisi veya kullanım soruları. Tesis türünüzü, oda veya yatak sayınızı ve ihtiyaçlarınızı paylaşmanız yeterli.")}</p><div className={styles.contactLinks}>{email&&<a href={`mailto:${email}`} className="uni-control"><Mail size={22}/>{email}</a>}{phone&&<a href={`tel:${phone.replace(/[^+\d]/g,'')}`} className="uni-control"><Phone size={22}/>{phone}</a>}{address&&<p><MapPin size={22}/> {address}</p>}</div><div className={styles.note}><strong>{m("Ürünü daha yakından tanıyın.")}</strong><p><a href="/screenshots" className="uni-control">{m("Uygulama ekranlarını inceleyin ↗")}</a></p><p><a href="/#faq" className="uni-control">{m("Sık sorulan sorulara bakın ↗")}</a></p></div></div>{email?<ContactForm email={email} subject={m(subject)}/>:<div className={styles.empty}><h2>{m("İletişim kanallarımız hazırlanıyor.")}</h2><p>{m("Güncel e-posta ve telefon bilgilerimiz bu sayfada yayımlanacak.")}</p><a href="/login" className="uni-control">{m("Mevcut hesabınızla uygulamayı açın ↗")}</a></div>}</div></section></MarketingShell>
}
