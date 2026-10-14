"use client";
import { useMarketingI18n } from "./MarketingI18n";
import { useRef, useState } from 'react';
import { Expand, X } from 'lucide-react';
import styles from './MarketingPages.module.css';
const shots=[
 {name:'board',title:'Oda durum çizelgesi',category:'Günlük operasyon',description:'Birimlerin temizlik ve konaklama durumunu, misafirleri ve giriş–çıkış tarihlerini aynı görünümde takip edin.'},
 {name:'property-3d',title:'3 boyutlu tesis görünümü',category:'Tesis yönetimi',description:'Katları, odaları ve yatak yerleşimlerini üç boyutlu planda inceleyin. Birimleri konaklama durumlarıyla birlikte görün.'},
 {name:'calendar',title:'Konaklama takvimi',category:'Rezervasyon',description:'Rezervasyonların tarihlere ve birimlere dağılımını görün. Konaklama planını takvim üzerinden inceleyin.'},
 {name:'bookings',title:'Rezervasyon listesi',category:'Rezervasyon',description:'Rezervasyonları durum, misafir ve tarih bilgileriyle birlikte listeleyin; günlük işlemlerinize buradan ulaşın.'},
 {name:'notes',title:'Resepsiyon notları',category:'Günlük operasyon',description:'Yapılacak, devam eden ve tamamlanan işleri aynı panoda tutun. Vardiyalar arasında bilgiyi paylaşın.'},
 {name:'property',title:'Kat ve oda tanımları',category:'Tesis yönetimi',description:'Tesisinizin katlarını ve birimlerini düzenleyin. Oda, daire ve yatak yapısını işletmenize göre tanımlayın.'},
 {name:'stays',title:'Konaklayan listesi',category:'Günlük operasyon',description:'Tesisinizdeki mevcut konaklamaları ve planlanan çıkışları takip edin; ilgili misafir ve rezervasyon bilgilerine ulaşın.'},
 {name:'amenities',title:'Olanaklar ve oda envanteri',category:'Tesis yönetimi',description:'Banyo, oda donanımı ve diğer olanakları ortak katalogda inceleyin. Oda tanımlarında kullanılacak özellik ve envanter seçeneklerini görün.'},
 {name:'new-booking',title:'Rezervasyon oluşturma',category:'Rezervasyon',description:'Tarih, uygun birim, misafir ve fiyat bilgilerini bir araya getirerek yeni rezervasyonunuzu hazırlayın.'},
 {name:'settings',title:'Kişisel kullanım ayarları',category:'Kişiselleştirme',description:'Arayüz görünümünü, dil ve para birimi tercihlerini çalışma alışkanlıklarınıza göre düzenleyin.'},
 {name:'report-dashboard',title:'Yönetim özeti',category:'Raporlama',description:'Konaklama geliri, tahsilat ve doluluk göstergelerini aynı ekranda değerlendirin. Dönem içindeki değişimleri grafiklerle izleyin.'},
 {name:'report-revenue',title:'Günlük gelir ve tahsilat',category:'Raporlama',description:'Konaklama gelirini ve gerçekleşen tahsilatı ayrı takip edin. Tarih, tesis ve para birimi filtreleriyle dönem hareketlerini inceleyin.'},
 {name:'report-occupancy',title:'Günlük doluluk',category:'Raporlama',description:'Fiziksel kapasite ve satılabilir kapasite doluluğunu karşılaştırın. Dolu ve boş birim-geceleri tarih bazında görün.'},
 {name:'report-payments',title:'Ödeme yöntemleri',category:'Raporlama',description:'Tahsilatların kredi kartı, banka havalesi, nakit ve online ödeme dağılımını halka grafikle inceleyin. İade ve ödeme tutarlarını ayrı karşılaştırın.'},
];
export function ScreenshotGallery(){
 const { m } = useMarketingI18n();
 const [filter,setFilter]=useState('Tümü');const [selected,setSelected]=useState<(typeof shots)[number]|null>(null);const dialog=useRef<HTMLDialogElement>(null);
 return <><div className={styles.galleryNav} aria-label={m("Ekran kategorileri")}>{['Tümü', ...new Set(shots.map(shot => shot.category))].map(category=><button key={m(category)} className={styles.filter} aria-pressed={filter===category} onClick={()=>setFilter(category)}>{m(category)}</button>)}</div><div className={styles.shots}>{shots.filter(s=>filter==='Tümü'||s.category===filter).map(s=><article className={styles.shot} key={s.name}><button aria-label={`${m(s.title)} ekranını büyüt`} onClick={()=>{setSelected(s);dialog.current?.showModal();}}><img src={`/images/screenshots/${s.name}.avif`} srcSet={`/images/screenshots/${s.name}-small.avif 720w, /images/screenshots/${s.name}.avif 1440w`} sizes="(max-width:760px) calc(100vw - 72px), 42vw" width={1440} height={1000} alt={`${m(s.title)}: örnek Mavi Avlu Otel kayıtlarıyla gerçek uygulama ekranı`} loading="lazy"/><span className={styles.zoomLabel}>{m(s.category)}<Expand size={18}/></span></button><h2>{m(s.title)}</h2><p>{m(s.description)}</p></article>)}</div><dialog className={styles.dialog} ref={dialog} aria-labelledby="screenshot-title" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}><div className={styles.dialogHeader}><h2 id="screenshot-title">{m(selected?.title || "")}</h2><button className={`${styles.close} nav-icon-button`} aria-label={m("Görüntüyü kapat")} onClick={()=>dialog.current?.close()}><X size={22}/></button></div>{selected&&<img src={`/images/screenshots/${selected.name}.avif`} width={1440} height={1000} alt={m(selected.title)}/>}<p>{m(selected?.description || "")}</p></dialog></>;
}
