"use client";
import React, { useId, useState } from "react";
import { Check, ArrowUpRight, ALargeSmall, LogOut, Palette, ShieldCheck, User, Banknote, Globe } from "lucide-react";
import { confirmDialog } from "./ConfirmDialog";
import { useI18n } from "./I18n";
import { LOCALES, type Locale } from "../lib/i18n/config";
import { CountrySelect } from "./CountrySelect";
import {
  countryByCode,
  countryFlag,
  currencyForCountry,
} from "../lib/countries";
import { FONT_SIZE_OPTIONS, useFontSize } from "./FontSize";
import { THEME_OPTIONS, useTheme } from "./Theme";
import {
  CURRENCIES,
  MONEY_FORMATS,
  currencySymbolClass,
  formatMoney,
  useCurrency,
} from "./Currency";
import { buttonStyle, secondaryStyle } from "./FormKit";

interface AppSettingsViewProps {
  userName: string;
  userRole: string;
  onLogout: () => void;
}

function SectionHeading({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-uni-surface text-uni-muted">{icon}</span>
      <div>
        <h3 className="text-base font-medium text-uni-ink">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-uni-muted">{description}</p>
      </div>
    </div>
  );
}

export function AppSettingsView({ userName, userRole, onLogout }: AppSettingsViewProps) {
  const { locale, direction, setLocale, t } = useI18n();
  const { size, setSize } = useFontSize();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency, format, setFormat, defaultCountry, setDefaultCountry, currencyAuto, resetCurrencyAuto } = useCurrency();
  const groupId = useId();
  const [previewMessage, setPreviewMessage] = useState("");
  const currentTheme = THEME_OPTIONS.find((option) => option.id === theme)!;
  const countryCurrency = currencyForCountry(defaultCountry);
  const countryCurrencyLabel = CURRENCIES.find((o) => o.id === countryCurrency);

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-5 pb-8 font-sans text-uni-ink">
      <header className="px-1 pb-2 pt-2">
        <h2 className="text-[32px] font-medium leading-tight tracking-[-0.03em]">Ayarlar</h2>
        <p className="mt-2 text-sm text-uni-muted">Çalışma alanını kendine göre düzenle.</p>
      </header>

      <section aria-label="Görünüm" className="uni-card rounded-[24px] border border-uni-border bg-white p-5 sm:p-6">
        <SectionHeading icon={<Palette size={20} />} title="Tema rengi" description="Menüler, butonlar ve vurgular seçtiğin renge uyum sağlar." />
        <fieldset>
          <legend className="sr-only">Tema Rengi</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {THEME_OPTIONS.map((option) => (
              <label key={option.id} className="relative min-w-0 cursor-pointer">
                <input
                  type="radio"
                  name={`${groupId}-theme`}
                  value={option.id}
                  checked={theme === option.id}
                  onChange={() => setTheme(option.id)}
                  className="peer sr-only"
                  aria-label={option.label}
                />
                <span className="uni-choice flex min-h-[100px] flex-col items-center justify-center gap-3 rounded-2xl border border-transparent bg-uni-surface px-2 py-4 transition-colors duration-150 hover:bg-uni-hover peer-checked:border-slate-400 peer-checked:bg-white peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neutral-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: option.color }}>
                    {theme === option.id && <Check size={17} strokeWidth={2.5} className={option.id === "purple" ? "text-white" : "text-[#131313]"} />}
                  </span>
                  <span className="text-xs font-medium">{option.label}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-uni-muted" aria-live="polite">
          <Check size={14} className="text-brand-blue-600" />
          <span>{currentTheme.label} tema etkin</span>
          <span aria-hidden="true" className="mx-1">·</span>
          <span>Otomatik kaydedildi</span>
        </div>

        <div className="my-6 border-t border-uni-border" />

        <SectionHeading icon={<ALargeSmall size={20} />} title="Yazı boyutu" description="Senin için en rahat okunan boyutu seç." />
        <fieldset>
          <legend className="sr-only">Yazı Boyutu</legend>
          <div className="grid grid-cols-2 gap-1 rounded-[20px] border border-uni-border p-1 sm:grid-cols-4">
            {FONT_SIZE_OPTIONS.map((option) => (
              <label key={option.id} className="relative min-w-0 cursor-pointer">
                <input
                  type="radio"
                  name={`${groupId}-font`}
                  value={option.id}
                  checked={size === option.id}
                  onChange={() => setSize(option.id)}
                  className="peer sr-only"
                  aria-label={option.label}
                />
                <span className="uni-choice flex min-h-10 items-center justify-center rounded-2xl px-2 py-2 text-xs font-medium text-uni-muted transition-colors hover:bg-uni-surface peer-checked:bg-uni-hover peer-checked:text-uni-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neutral-400">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 rounded-[20px] border border-uni-border bg-uni-surface p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-uni-muted">Canlı önizleme</span>
            <span className="rounded-full bg-brand-blue-100 px-2.5 py-1 text-xs font-medium text-brand-blue-600">12 aktif kayıt</span>
          </div>
          <p className="text-lg font-medium tracking-[-0.02em]">Oda Durum Çizelgesi</p>
          <p className="mt-1 text-sm leading-6 text-uni-muted">Oda ve rezervasyonlarını tek bir yerden yönet.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={`uni-control ${buttonStyle}`} onClick={() => setPreviewMessage("Birincil buton önizlemesi. Tema tüm uygulamaya uygulandı.")}>
              Rezervasyon Al <ArrowUpRight size={16} />
            </button>
            <button type="button" className="uni-control uni-button uni-button-soft" onClick={() => setPreviewMessage("İkincil buton önizlemesi. Tema tüm uygulamaya uygulandı.")}>
              Detayları Gör
            </button>
          </div>
          <p role="status" className="mt-3 text-xs leading-5 text-uni-muted">{previewMessage || "Butonları deneyerek renk ve etkileşimleri önizleyebilirsin."}</p>
        </div>
      </section>

      <section lang={locale} dir={direction} aria-label={t("language.title")} className="uni-card rounded-[24px] border border-uni-border bg-white p-5 sm:p-6">
        <SectionHeading icon={<Globe size={20} />} title={t("language.title")} description={t("language.description")} />
        <label className="block text-sm font-medium">
          {t("language.title")}
          <select value={locale} onChange={(event) => setLocale(event.target.value)} className="mt-2 block w-full rounded-xl border border-uni-border bg-uni-surface px-3 py-3">
            {(Object.keys(LOCALES) as Locale[]).map((code) => (
              <option key={code} value={code} lang={code}>{LOCALES[code].label}</option>
            ))}
          </select>
        </label>
      </section>

      <section aria-label={t("country.defaultTitle")} className="uni-card rounded-[24px] border border-uni-border bg-white p-5 sm:p-6">
        <SectionHeading icon={<Globe size={20} />} title={t("country.defaultTitle")} description={t("country.defaultDescription")} />
        <CountrySelect label={t("country.label")} value={defaultCountry} onChange={setDefaultCountry} />
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-uni-muted" aria-live="polite">
          <span aria-hidden="true" className="text-base leading-none">{countryFlag(defaultCountry)}</span>
          <span>{countryByCode(defaultCountry, locale)?.name}</span>
          <span aria-hidden="true" className="mx-1">·</span>
          {countryCurrencyLabel ? (
            <span>Para birimi: <span className="font-bold text-uni-ink">{countryCurrencyLabel.label} ({countryCurrencyLabel.id})</span></span>
          ) : (
            <span>Bu ülkenin listede para birimi yok, mevcut korunur</span>
          )}
        </div>
        {!currencyAuto && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-uni-surface px-4 py-3 text-xs text-uni-muted">
            <span>Para birimi elle seçildiği için otomatik takip kapalı.</span>
            <button type="button" className="uni-control cursor-pointer font-bold text-brand-blue-700 hover:underline" onClick={resetCurrencyAuto}>
              Otomatik takibe dön
            </button>
          </div>
        )}
      </section>

      <section aria-label="Para birimi" className="uni-card rounded-[24px] border border-uni-border bg-white p-5 sm:p-6">
        <SectionHeading icon={<Banknote size={20} />} title="Para birimi" description="Tutarlar hangi para birimi ve biçimde gösterilir. Belgelerdeki kayıtlı para birimi değişmez." />
        <fieldset>
          <legend className="sr-only">Para Birimi</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CURRENCIES.map((option) => (
              <label key={option.id} className="relative min-w-0 cursor-pointer">
                <input
                  type="radio"
                  name={`${groupId}-currency`}
                  value={option.id}
                  checked={currency === option.id}
                  onChange={() => setCurrency(option.id)}
                  className="peer sr-only"
                  aria-label={`${option.label} (${option.symbol})`}
                />
                <span className="uni-choice flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-2xl border border-transparent bg-uni-surface px-2 py-3 transition-colors duration-150 hover:bg-uni-hover peer-checked:border-slate-400 peer-checked:bg-white peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neutral-400">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-uni-hover font-bold text-uni-ink ${currencySymbolClass(option.symbol)}`}>
                    {currency === option.id ? (
                      <Check size={17} strokeWidth={2.5} />
                    ) : (
                      option.symbol
                    )}
                  </span>
                  <span className="text-xs font-bold">{option.id}</span>
                  <span className="text-[11px] text-uni-muted">{option.label}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="my-6 border-t border-uni-border" />

        <fieldset>
          <legend className="text-xs font-medium text-uni-muted">Sayı biçimi</legend>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-[20px] border border-uni-border p-1">
            {MONEY_FORMATS.map((option) => (
              <label key={option.id} className="relative min-w-0 cursor-pointer">
                <input
                  type="radio"
                  name={`${groupId}-format`}
                  value={option.id}
                  checked={format === option.id}
                  onChange={() => setFormat(option.id)}
                  className="peer sr-only"
                  aria-label={`${option.hint} (${option.label})`}
                />
                <span className="uni-choice flex min-h-10 flex-col items-center justify-center rounded-2xl px-2 py-2 transition-colors hover:bg-uni-surface peer-checked:bg-uni-hover peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neutral-400">
                  <span className="text-xs font-bold text-uni-ink">{option.label}</span>
                  <span className="text-[11px] text-uni-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-uni-muted" aria-live="polite">
          <span>Örnek:</span>
          <span className="font-bold text-uni-ink">{formatMoney(450000, currency, format)} / gece</span>
          <span aria-hidden="true" className="mx-1">·</span>
          <span>{currencyAuto ? "Varsayılan ülkeyi takip ediyor" : "Elle seçim etkin"}</span>
          <span aria-hidden="true" className="mx-1">·</span>
          <span>Otomatik kaydedildi</span>
        </div>
      </section>

      <section aria-labelledby="account-heading" className="uni-card rounded-[24px] border border-uni-border bg-white p-5 sm:p-6">
        <h3 id="account-heading" className="mb-5 text-base font-medium">Hesap</h3>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-100 text-brand-blue-600"><User size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium">{userName}</p>
            <p className="mt-1 text-xs text-uni-muted">Aktif kullanıcı</p>
          </div>
        </div>
        <div className="my-4 border-t border-uni-border" />
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-uni-muted"><ShieldCheck size={17} /> Erişim yetkisi</span>
          <span className="font-medium">{userRole}</span>
        </div>
      </section>

      <div className="flex flex-col items-center gap-4 pt-1">
        <button
          type="button"
          className={`uni-control ${secondaryStyle} w-full sm:w-auto`}
          onClick={async () => {
            if (await confirmDialog("Oturumu kapatmak istediğinize emin misiniz?")) onLogout();
          }}
        >
          <LogOut size={16} /> Oturumu Kapat
        </button>
        <p className="px-3 text-center text-xs leading-5 text-uni-muted">Tercihlerin bu cihazda saklanır ve tüm uygulamaya uygulanır.</p>
      </div>
    </div>
  );
}
