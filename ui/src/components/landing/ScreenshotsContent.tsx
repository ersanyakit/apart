"use client";
import { useMarketingI18n } from "./MarketingI18n";
import { ArrowUpRight } from 'lucide-react';
import { MarketingShell } from './MarketingShell';
import { PageIntro } from './PageIntro';
import { ScreenshotGallery } from './ScreenshotGallery';
import styles from './MarketingPages.module.css';
import shared from './Landing.module.css';
export function ScreenshotsContent(){
 const { m } = useMarketingI18n();return <MarketingShell><PageIntro eyebrow={m("EKRAN GÖRÜNTÜLERİ")} title={m("İçeride sizi neler bekliyor?")} description={m("Günün ilk rezervasyonundan son oda kontrolüne. Her işin yerini, uygulamanın kendi ekranlarında görün.")} image="gallery" alt={m("Minyatür otel gösteren çizgi film monitör ve büyüteç")}/><section className={styles.content} aria-label={m("Uygulama ekranları")}><div className={styles.heading}><h2>{m("Tanıdık işler.")}<br/>{m("Düzenli bir çalışma alanı.")}</h2><p>{m("3D tesis görünümü, olanaklar ve raporlama dahil 14 farklı ekran. Gerçek uygulamadan, örnek tesis ve misafir verileriyle alınan görüntüler. Detayları incelemek için herhangi bir ekranı büyütebilirsiniz.")}</p></div><p className={styles.note}>{m("Görüntüler Türkçe arayüzden alınmıştır.")}</p><ScreenshotGallery/><div className={styles.banner}><div><h2>{m("Kendi oteliniz için düşünün.")}</h2><p>{m("İhtiyaçlarınızı konuşalım, sorularınızı netleştirelim.")}</p></div><a className={`${shared.button} uni-control`} href="/contact">{m("İletişime geç")}<ArrowUpRight size={18}/></a></div></section></MarketingShell>}
