import App from '../App';
import { initialSync } from '../lib/server';
export const dynamic='force-dynamic';
export default async function Page(){const data=await initialSync();return <App initialData={data}/>;}
