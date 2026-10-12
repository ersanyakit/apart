'use client';
import { contracts } from '../lib/api';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="min-h-screen grid place-items-center bg-slate-100"><div className="bg-white p-10 rounded-3xl shadow-sm text-center"><h1 className="font-black text-xl">INTERACTIVEOTEL</h1><p className="my-6 text-slate-500">{contracts.errors.internal_error}</p><button onClick={reset} className="rounded-xl bg-brand-blue-600 text-white px-6 py-3">Tekrar dene</button></div></main>;}
