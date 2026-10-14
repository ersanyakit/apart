import App from '../../App';
export const dynamic = 'force-dynamic';
export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;
  return <App initialData={null} initialTab={typeof params.tab === 'string' ? params.tab : 'board'} />;
}
