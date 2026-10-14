"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BedDouble,
  CalendarCheck,
  FileText,
  Languages,
  LayoutGrid,
  Boxes,
  ShieldCheck,
  Users,
  Wallet,
  Plus,
  Check,
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

function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-[13px] font-black uppercase tracking-[0.18em] text-brand-blue-600">
        {eyebrow}
      </p>
      <h2 className="font-uninav-book mt-3 text-balance text-3xl tracking-tight text-slate-900 sm:text-[40px] sm:leading-[1.1]">
        {title}
      </h2>
      <p className="font-uninav-book mt-4 text-pretty text-lg leading-8 text-slate-500">
        {sub}
      </p>
    </Reveal>
  );
}

const features = [
  {
    icon: CalendarCheck,
    title: "Rezervasyon ve konaklama",
    desc: "Tarih, misafir ve fiyat tek formda. Giriş-çıkış, erken giriş ve oda taşıma tek tıkla.",
  },
  {
    icon: LayoutGrid,
    title: "Oda durum çizelgesi",
    desc: "Canlı pano: dolu, rezervli, temiz ve kirli durumları; kat planı üzerinde düzenleme.",
  },
  {
    icon: Boxes,
    title: "3D tesis görünümü",
    desc: "Katları patlatılmış şemada gezin, odaya dokun, yatak yerlerini ve doluluğu görün.",
  },
  {
    icon: Users,
    title: "Misafir arama ve geçmiş",
    desc: "Ad, kimlik veya telefonla bulun; geçmiş konaklamaları, notları ve uyruk bilgisini açın.",
  },
  {
    icon: Wallet,
    title: "Kapora takibi",
    desc: "Alınan kaporayı tutarı ve ödeme kanalıyla (nakit, havale, EFT, kart, kripto) kaydedin.",
  },
  {
    icon: FileText,
    title: "Sözleşme ve dekontlar",
    desc: "Çok dilli şablonlardan tek tıkla PDF belge üretin; kayıtlı metin sonradan değişmez.",
  },
  {
    icon: BedDouble,
    title: "Birim, yatak ve olanaklar",
    desc: "Oda, daire ve ranza tanımları; jakuzi, klima gibi olanakları çok dilli yönetin.",
  },
  {
    icon: ShieldCheck,
    title: "Personel ve roller",
    desc: "Şube bazlı erişim, rol bazlı yetkiler ve her işlemin denetim kaydı.",
  },
  {
    icon: Languages,
    title: "60 dil, 32 para birimi",
    desc: "Arayüz ve içerik dillerini ayarlardan yönetin; tutarlar seçtiğiniz biçimde görünsün.",
  },
];

function Features() {
  return (
    <section id="ozellikler" aria-label="Özellikler" className="scroll-mt-20 py-20 sm:py-28">
      <div className={container}>
        <SectionHeading
          eyebrow="Özellikler"
          title="Resepsiyonun ihtiyacı olan her şey"
          sub="Ayrı ayrı araçlara dağılmayın. Operasyonun tamamı tek panelde, tek oturumda."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.07}>
              <article className="group h-full rounded-[20px] bg-[#f9f9f9] p-6 outline-none transition-all duration-150 ease-out hover:bg-[#efefef] focus-visible:ring-2 focus-visible:ring-neutral-400">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue-500 text-accent-contrast shadow-md shadow-brand-blue-500/25 transition-transform duration-150 group-hover:scale-105">
                  <f.icon size={20} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <h3 className="font-uninav-book mt-4 text-[1.125rem] leading-6 text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-[0.9375rem] leading-6 text-slate-500">{f.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    n: "1",
    title: "Tesisi tanımlayın",
    desc: "Katları, odaları ve yatakları ekleyin; olanakları ve ödeme kanallarını bir kez ayarlayın.",
  },
  {
    n: "2",
    title: "Rezervasyonu alın",
    desc: "Tarih, misafir ve kaporayı girin; müsaitlik anında kontrol edilsin.",
  },
  {
    n: "3",
    title: "Konaklamayı yönetin",
    desc: "Giriş-çıkış yapın, oda taşıyın, dekontu kesin. Hepsi kayıtta dursun.",
  },
];

function Steps() {
  return (
    <section
      id="nasil-calisir"
      aria-label="Nasıl çalışır"
      className="scroll-mt-20 border-y border-slate-900/[0.06] bg-[#f9f9f9] py-20 sm:py-28"
    >
      <div className={container}>
        <SectionHeading
          eyebrow="Nasıl çalışır"
          title="Üç adımda operasyona başlayın"
          sub="Kurulum saatler değil dakikalar sürer. Demo otel verisiyle hemen deneyin."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <article className="h-full rounded-[20px] bg-white p-7 shadow-[0_16px_48px_-24px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.05]">
                <p className="font-uninav-book text-5xl tracking-tight text-brand-blue-500">
                  {s.n}
                </p>
                <h3 className="font-uninav-book mt-4 text-xl leading-7 text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-2 leading-7 text-slate-500">{s.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "Kurulum ne kadar sürer?",
    a: "Tesis, kat ve birim tanımları dakikalar içinde yapılır; toplu birim oluşturma ile onlarca oda tek seferde açılır. Olanaklar ve ödeme kanalları bir kez ayarlanır.",
  },
  {
    q: "Hangi diller destekleniyor?",
    a: "Arayüz ve misafir içerikleri için Hintçe, Urduca, Arapça ve Çince dahil 60 dil; uyruk seçiminde 249 ülke bayrağı bulunur. Dil, ayarlardan tek merkezden yönetilir.",
  },
  {
    q: "Hangi para birimleri var?",
    a: "Türk lirası, dolar, euro ve sterlin dahil 32 para birimi; Türkçe ve İngilizce sayı biçimi. Belgelerdeki kayıtlı tutar ve para birimi sonradan değişmez.",
  },
  {
    q: "İnternet bağlantısı gerekli mi?",
    a: "Evet. Uygulama tesisinizin sunucusuna bağlanır; tüm kayıtlar merkezi veritabanında tutulur ve her işlem denetim kaydına işlenir.",
  },
  {
    q: "Personel yetkileri nasıl çalışır?",
    a: "Yönetici, resepsiyon, muhasebe, kat hizmetleri ve teknik servis rolleriyle şube bazında erişim verilir. Hassas işlemler (ör. tesis silme) yalnızca yöneticilere açıktır ve fiziksel silme yapılmaz.",
  },
  {
    q: "Misafir geçmişine nasıl ulaşırım?",
    a: "Ad, kimlik veya telefonla arama yapın; geçmiş konaklamaları, ödenen tutarları ve kişi notlarını tek pencerede görün.",
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  return (
    <section id="sss" aria-label="Sık sorulan sorular" className="scroll-mt-20 py-20 sm:py-28">
      <div className={`${container} max-w-3xl`}>
        <SectionHeading
          eyebrow="SSS"
          title="Sık sorulan sorular"
          sub="Aklınızda kalan olursa resepsiyon akışının içinden bize ulaşın."
        />
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div
                  className={`overflow-hidden rounded-[20px] transition-colors ${
                    isOpen ? "bg-[#f9f9f9]" : "bg-[#f9f9f9]/60 hover:bg-[#f9f9f9]"
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue-500/40"
                  >
                    <span className="font-uninav-book text-[17px] leading-6 text-slate-900">
                      {f.q}
                    </span>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                        isOpen ? "rotate-45 bg-brand-blue-500 text-accent-contrast" : "bg-black/[0.06] text-slate-600"
                      }`}
                    >
                      <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="faq-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.22, ease: [0.32, 0.72, 0, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-6 leading-7 text-slate-500">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section aria-label="Hemen başlayın" className="pb-20 sm:pb-28">
      <div className={container}>
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] bg-slate-900 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_50%_110%,var(--color-brand-blue-500),transparent)] opacity-40"
            />
            <div className="relative">
              <h2 className="font-uninav-book mx-auto max-w-2xl text-balance text-3xl tracking-tight text-white sm:text-5xl sm:leading-[1.08]">
                Resepsiyonu bugünden rahatlatın.
              </h2>
              <p className="font-uninav-book mx-auto mt-4 max-w-xl text-lg leading-8 text-white/60">
                Hesabınızla giriş yapın, tesisinizi seçin ve ilk rezervasyonu alın.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="/login"
                  className="uni-control w-full rounded-full bg-brand-blue-500 px-8 py-4 text-base font-bold text-accent-contrast shadow-xl transition-all hover:brightness-[1.06] active:scale-[0.98] sm:w-auto"
                >
                  Giriş Yap
                </a>
                <a
                  href="#top"
                  className="uni-control w-full rounded-full bg-white/10 px-8 py-4 text-base font-bold text-white ring-1 ring-inset ring-white/20 transition-all hover:bg-white/15 active:scale-[0.98] sm:w-auto"
                >
                  Başa Dön
                </a>
              </div>
              <p className="mt-6 flex items-center justify-center gap-4 text-[13px] font-medium text-white/50">
                <span className="flex items-center gap-1.5"><Check size={14} aria-hidden="true" /> 60 dil</span>
                <span className="flex items-center gap-1.5"><Check size={14} aria-hidden="true" /> 32 para birimi</span>
                <span className="flex items-center gap-1.5"><Check size={14} aria-hidden="true" /> Denetim kaydı</span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-900/[0.06] py-12">
      <div className={`${container} flex flex-col gap-8 md:flex-row md:items-start md:justify-between`}>
        <div>
          <p className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-blue-500 font-black text-sm text-accent-contrast">
              i
            </span>
            <span className="font-uninav-book text-[17px] tracking-tight text-slate-900">
              INTERACTIVE<span className="text-brand-blue-600">OTEL</span>
            </span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
            Otel, apart ve hostel operasyonları için tek panel.
          </p>
        </div>
        <nav aria-label="Alt bilgi" className="grid grid-cols-2 gap-10 text-sm sm:flex sm:gap-16">
          <div>
            <p className="text-[13px] font-black uppercase tracking-wider text-slate-400">Ürün</p>
            <ul className="mt-3 space-y-2.5 font-medium text-slate-600">
              <li><a className="transition-colors hover:text-slate-900" href="#ozellikler">Özellikler</a></li>
              <li><a className="transition-colors hover:text-slate-900" href="#nasil-calisir">Nasıl çalışır?</a></li>
              <li><a className="transition-colors hover:text-slate-900" href="#sss">SSS</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-black uppercase tracking-wider text-slate-400">Hesap</p>
            <ul className="mt-3 space-y-2.5 font-medium text-slate-600">
              <li><a className="transition-colors hover:text-slate-900" href="/login">Giriş Yap</a></li>
              <li><a className="transition-colors hover:text-slate-900" href="/app?tab=board">Panele Git</a></li>
            </ul>
          </div>
        </nav>
      </div>
      <div className={`${container} mt-10 flex flex-col gap-2 border-t border-slate-900/[0.06] pt-6 text-[13px] text-slate-400 sm:flex-row sm:items-center sm:justify-between`}>
        <p>© 2026 INTERACTIVEOTEL — Tüm hakları saklıdır.</p>
        <p>Otel, apart ve hostel yönetimi.</p>
      </div>
    </footer>
  );
}

export function LandingSections() {
  return (
    <>
      <Features />
      <Steps />
      <Faq />
      <Cta />
      <Footer />
    </>
  );
}
