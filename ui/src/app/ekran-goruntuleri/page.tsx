import { permanentRedirect } from "next/navigation";

export default async function LegacyPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const name = key === "konu" ? "subject" : key;
    if (Array.isArray(value)) value.forEach(item => query.append(name, item));
    else if (value !== undefined) query.set(name, value);
  }
  const suffix = query.toString();
  permanentRedirect("/screenshots" + (suffix ? `?${suffix}` : ""));
}
