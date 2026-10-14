"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  LogIn,
} from "lucide-react";

const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-900/[0.06] bg-white/80 backdrop-blur-xl">
      <nav
        aria-label="Ana gezinme"
        className={`${container} flex h-16 items-center justify-between gap-4`}
      >
        <a href="#top" className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/40 rounded-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-blue-500 font-black text-sm text-accent-contrast">
            i
          </span>
          <span className="font-uninav-book text-[17px] tracking-tight text-slate-900">
            INTERACTIVE<span className="text-brand-blue-600">OTEL</span>
          </span>
        </a>
        <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <a className="transition-colors hover:text-slate-900" href="#ozellikler">Özellikler</a>
          <a className="transition-colors hover:text-slate-900" href="#nasil-calisir">Nasıl çalışır?</a>
          <a className="transition-colors hover:text-slate-900" href="#sss">SSS</a>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:block"
          >
            Giriş Yap
          </a>
          <a
            href="/login"
            className="uni-control rounded-full bg-brand-blue-500 px-5 py-2.5 text-sm font-bold text-accent-contrast shadow-lg shadow-brand-blue-500/25 transition-all hover:brightness-[0.96] active:scale-[0.98]"
          >
            Hemen Başla
          </a>
        </div>
      </nav>
    </header>
  );
}

const rooms = [
  { code: "101", label: "Temiz", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
  { code: "102", label: "Kirli", dot: "bg-orange-500", pill: "bg-orange-50 text-orange-700" },
  { code: "103", label: "Dolu", dot: "bg-red-500", pill: "bg-red-50 text-red-600" },
  { code: "104", label: "Rezervli", dot: "bg-brand-blue-500", pill: "bg-brand-blue-50 text-brand-blue-700" },
];

const week = [
  { d: "Pzt", n: "12", active: false },
  { d: "Sal", n: "13", active: false },
  { d: "Çar", n: "14", active: true },
  { d: "Per", n: "15", active: false },
  { d: "Cum", n: "16", active: false },
  { d: "Cmt", n: "17", active: false },
  { d: "Paz", n: "18", active: false },
];

function HeroMock() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-14 w-full max-w-3xl"
    >
      <div
        aria-hidden="true"
        className="absolute -inset-x-8 -top-10 bottom-0 -z-10 rounded-[48px] bg-[radial-gradient(ellipse_at_50%_0%,var(--color-brand-blue-100),transparent_65%)] blur-2xl"
      />
      <div className="overflow-hidden rounded-[28px] border border-slate-900/[0.08] bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.25)]">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="ml-3 truncate text-xs font-semibold text-slate-500">
            Oda Durum Çizelgesi
          </span>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Canlı
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4 sm:p-5">
          {rooms.map((r) => (
            <div
              key={r.code}
              className="rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-900/[0.04]"
            >
              <p className="font-uninav-book text-xl leading-7 text-slate-900">{r.code}</p>
              <p className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${r.pill}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
                {r.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl bg-slate-900 p-3.5 text-white sm:mx-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-black">
            A
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">Ayşe Yılmaz · 103</span>
            <span className="block truncate text-xs text-white/60">14 Eki → 16 Eki · 2 gece</span>
          </span>
          <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-900">
            ₺9.000
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 px-4 pb-4 pt-2 sm:px-5">
          {week.map((w) => (
            <div
              key={w.d}
              className={`rounded-xl py-2 text-center ${
                w.active ? "bg-brand-blue-500 text-accent-contrast shadow-md shadow-brand-blue-500/30" : "text-slate-500"
              }`}
            >
              <p className="text-[10px] font-bold uppercase">{w.d}</p>
              <p className="font-uninav-book text-base leading-6">{w.n}</p>
            </div>
          ))}
        </div>
      </div>
      <motion.div
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-3 top-16 hidden rounded-2xl border border-slate-900/[0.06] bg-white/95 px-4 py-3 shadow-xl backdrop-blur sm:block"
      >
        <p className="font-uninav-book text-2xl leading-7 text-slate-900">%94</p>
        <p className="text-xs font-medium text-slate-500">günlük doluluk</p>
      </motion.div>
      <motion.div
        animate={reduce ? undefined : { y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute -right-3 top-40 hidden rounded-2xl border border-slate-900/[0.06] bg-white/95 px-4 py-3 shadow-xl backdrop-blur sm:block"
      >
        <p className="flex items-center gap-1.5 font-uninav-book text-2xl leading-7 text-slate-900">
          <LogIn size={18} className="text-brand-blue-600" /> 12
        </p>
        <p className="text-xs font-medium text-slate-500">bugünkü giriş</p>
      </motion.div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-16 pt-32 sm:pt-40">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--color-brand-blue-100),transparent)]" />
      <div className={`${container} text-center`}>
        <Reveal>
          <a
            href="#ozellikler"
            className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 py-1.5 pl-2 pr-4 text-[13px] font-semibold text-slate-700 shadow-sm backdrop-blur transition-colors hover:border-slate-900/20"
          >
            <span className="rounded-full bg-brand-blue-500 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-accent-contrast">
              Yeni
            </span>
            3D tesis görünümü yayında
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="font-uninav-book mx-auto mt-6 max-w-4xl text-balance text-[42px] leading-[1.04] tracking-[-0.03em] text-slate-900 sm:text-6xl md:text-7xl">
            Otelin tamamı, <span className="text-brand-blue-600">tek panelde.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="font-uninav-book mx-auto mt-5 max-w-2xl text-pretty text-lg leading-8 text-slate-500 sm:text-xl">
            Rezervasyondan check-out&apos;a: oda durumu, konuklar, kapora ve
            belgeler — resepsiyonun ihtiyacı olan her şey bir arada.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/login"
              className="uni-control w-full rounded-full bg-brand-blue-500 px-8 py-4 text-base font-bold text-accent-contrast shadow-xl shadow-brand-blue-500/30 transition-all hover:brightness-[0.96] active:scale-[0.98] sm:w-auto"
            >
              Hemen Giriş Yap
            </a>
            <a
              href="#ozellikler"
              className="uni-control w-full rounded-full border border-slate-900/10 bg-white px-8 py-4 text-base font-bold text-slate-900 transition-all hover:border-slate-900/20 hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
            >
              Özellikleri Keşfet
            </a>
          </div>
        </Reveal>
        <HeroMock />
      </div>
    </section>
  );
}

const stats = [
  { value: "60", label: "arayüz ve içerik dili" },
  { value: "32", label: "para birimi desteği" },
  { value: "249", label: "ülke bayrağı ve uyruk" },
  { value: "13", label: "yönetim ekranı" },
];

function Stats() {
  return (
    <section aria-label="Öne çıkan sayılar" className="border-y border-slate-900/[0.06] bg-white">
      <div className={`${container} grid grid-cols-2 gap-y-10 py-12 lg:grid-cols-4`}>
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.06} className="text-center">
            <p className="font-uninav-book text-5xl tracking-tight text-slate-900">
              {s.value}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <LandingSections />
      </main>
    </div>
  );
}

import { LandingSections } from "./LandingSections";
