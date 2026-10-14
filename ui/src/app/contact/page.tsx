import type { Metadata } from 'next';
import { getMarketingTranslation } from '../../lib/i18n/marketing-server';
import { ContactContent } from '../../components/landing/ContactContent';
export async function generateMetadata(): Promise<Metadata> {
 const {m} = await getMarketingTranslation();
 return {title:m('İletişim | Interactiveotel'),description:m('Interactiveotel hakkında fiyat, ürün ve kullanım sorularınız için iletişim bilgileri.')};
}
export default async function Page({searchParams}:{searchParams:Promise<{subject?:string}>}) {
 const params=await searchParams;
 return <ContactContent email={process.env.MARKETING_CONTACT_EMAIL || ''} phone={process.env.MARKETING_CONTACT_PHONE || ''} address={process.env.MARKETING_CONTACT_ADDRESS || ''} subjectCode={typeof params.subject === 'string' ? params.subject : ''}/>;
}
