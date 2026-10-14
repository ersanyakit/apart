import type { Metadata } from 'next';
import { getMarketingTranslation } from '../../lib/i18n/marketing-server';
import { PricingContent } from '../../components/landing/PricingContent';
export async function generateMetadata(): Promise<Metadata> {
 const {m} = await getMarketingTranslation();
 return {title:m('Fiyatlar | Interactiveotel'),description:m('Otel, apart, pansiyon, günlük kiralık daire ve hostel işletmeniz için Interactiveotel kapsamını inceleyin, fiyat bilgisi için iletişime geçin.')};
}
export default function Page(){return <PricingContent/>;}
