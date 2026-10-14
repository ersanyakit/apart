import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { MarketingShell } from '../../components/landing/MarketingShell';
import { PageIntro } from '../../components/landing/PageIntro';
import { ScreenshotGallery } from '../../components/landing/ScreenshotGallery';
import styles from '../../components/landing/MarketingPages.module.css';
import shared from '../../components/landing/Landing.module.css';
export const metadata: Metadata={title:'Ekran Görüntüleri | Interactiveotel',description:'Oda durum çizelgesi, konaklama takvimi, rezervasyon ve resepsiyon ekranlarını gerçek uygulama görüntüleriyle keşfedin.'};
export default function ScreenshotsPage(){return <MarketingShell><PageIntro eyebrow="EKRAN GÖRÜNTÜLERİ" title="İçeride sizi neler bekliyor?" description="Günün ilk rezervasyonundan son oda kontrolüne. Her işin yerini, uygulamanın kendi ekranlarında görün." image="gallery" alt="Minyatür otel gösteren çizgi film monitör ve büyüteç"/><section className={styles.content} aria-label="Uygulama ekranları"><div className={styles.heading}><h2>Tanıdık işler.<br/>Düzenli bir çalışma alanı.</h2><p>3D tesis görünümü ve olanaklar dahil 10 farklı ekran. Gerçek uygulamadan, örnek tesis ve misafir verileriyle alınan görüntüler. Detayları incelemek için herhangi bir ekranı büyütebilirsiniz.</p></div><ScreenshotGallery/><div className={styles.banner}><div><h2>Kendi oteliniz için düşünün.</h2><p>İhtiyaçlarınızı konuşalım, sorularınızı netleştirelim.</p></div><a className={`${shared.button} uni-control`} href="/contact">İletişime geç <ArrowUpRight size={18}/></a></div></section></MarketingShell>}
