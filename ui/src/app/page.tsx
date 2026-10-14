import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Landing } from "../components/landing/Landing";

export const metadata: Metadata = {
  title: "INTERACTIVEOTEL | Otel Yönetim Sistemi",
  description:
    "Rezervasyondan check-out'a otelin tamamı tek panelde: oda durum çizelgesi, 3D tesis görünümü, misafir geçmişi, kapora takibi ve çok dilli belgeler.",
  openGraph: {
    title: "INTERACTIVEOTEL | Otel Yönetim Sistemi",
    description:
      "Rezervasyondan check-out'a otelin tamamı tek panelde: oda durum çizelgesi, 3D tesis görünümü, misafir geçmişi ve kapora takibi.",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "INTERACTIVEOTEL | Otel Yönetim Sistemi",
    description:
      "Rezervasyondan check-out'a otelin tamamı tek panelde.",
  },
};

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
