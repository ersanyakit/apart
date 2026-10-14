import type { Metadata } from 'next';
import { Mail, Phone, MapPin } from 'lucide-react';
import { MarketingShell } from '../../components/landing/MarketingShell';
import { PageIntro } from '../../components/landing/PageIntro';
import { ContactForm } from '../../components/landing/ContactForm';
import styles from '../../components/landing/MarketingPages.module.css';
export const metadata: Metadata={title:'İletişim | Interactiveotel',description:'Interactiveotel hakkında fiyat, ürün ve kullanım sorularınız için iletişim bilgileri.'};
export default async function ContactPage({searchParams}:{searchParams:Promise<{subject?:string}>}){
 const params=await searchParams;
 const email=process.env.MARKETING_CONTACT_EMAIL || '';
 const phone=process.env.MARKETING_CONTACT_PHONE || '';
 const address=process.env.MARKETING_CONTACT_ADDRESS || '';
 return <MarketingShell><PageIntro eyebrow="İLETİŞİM" title="İyi bir başlangıç, bir merhabayla." description="İster yeni bir tesis kuruyor olun, ister günlük işlerinizi daha düzenli yürütmek isteyin. Sorularınıza birlikte bakalım." image="contact" alt="Resepsiyon telefonu, açık mektup ve otel zili"/><section className={styles.content}><div className={styles.contactGrid}><div><h2>Neyi konuşalım?</h2><p>Ürünün işletmenize uygunluğu, fiyat bilgisi veya kullanım soruları. Tesis türünüzü, oda veya yatak sayınızı ve ihtiyaçlarınızı paylaşmanız yeterli.</p><div className={styles.contactLinks}>{email&&<a href={`mailto:${email}`} className="uni-control"><Mail size={22}/>{email}</a>}{phone&&<a href={`tel:${phone.replace(/[^+\d]/g,'')}`} className="uni-control"><Phone size={22}/>{phone}</a>}{address&&<p><MapPin size={22}/> {address}</p>}</div><div className={styles.note}><strong>Ürünü daha yakından tanıyın.</strong><p><a href="/screenshots" className="uni-control">Uygulama ekranlarını inceleyin ↗</a></p><p><a href="/#sss" className="uni-control">Sık sorulan sorulara bakın ↗</a></p></div></div>{email?<ContactForm email={email} subject={typeof params.subject==='string'?params.subject:''}/>:<div className={styles.empty}><h2>İletişim kanallarımız hazırlanıyor.</h2><p>Güncel e-posta ve telefon bilgilerimiz bu sayfada yayımlanacak.</p><a href="/login" className="uni-control">Mevcut hesabınızla uygulamayı açın ↗</a></div>}</div></section></MarketingShell>
}
