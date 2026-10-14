import type { Metadata } from 'next';
import { getMarketingTranslation } from '../../lib/i18n/marketing-server';
import { ScreenshotsContent } from '../../components/landing/ScreenshotsContent';
export async function generateMetadata(): Promise<Metadata> {
 const {m} = await getMarketingTranslation();
 return {title:m('Ekran Görüntüleri | Interactiveotel'),description:m('Oda durum çizelgesi, konaklama takvimi, rezervasyon ve resepsiyon ekranlarını gerçek uygulama görüntüleriyle keşfedin.')};
}
export default function Page(){return <ScreenshotsContent/>;}
