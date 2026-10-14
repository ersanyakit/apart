import type { Metadata } from "next";
import { getMarketingTranslation } from "../lib/i18n/marketing-server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Landing } from "../components/landing/Landing";

export async function generateMetadata(): Promise<Metadata> {
  const { m, locale } = await getMarketingTranslation();
  const title = `INTERACTIVEOTEL | ${m("Tesis yönetimi")}`;
  const description = m("Oda durum çizelgesi, konaklama takvimi, rezervasyon ve resepsiyon ekranlarını gerçek uygulama görüntüleriyle keşfedin.");
  return { title, description, openGraph: {title, description, type: "website", locale}, twitter: {card: "summary_large_image", title, description} };
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const jar = await cookies();
  if (jar.has("interactiveotel_session")) {
    const params = await searchParams;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
      else if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    }
    const qs = query.toString();
    redirect(`/app${qs ? `?${qs}` : ""}`);
  }
  return <Landing />;
}
