import App from '../App';
import { initialSync } from '../lib/server';
export const dynamic='force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const [data, params] = await Promise.all([initialSync(), searchParams]);
  return <App initialData={data} initialTab={typeof params.tab === "string" ? params.tab : "board"} />;
}
