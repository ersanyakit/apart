"use client";
import {InstallAppPanel} from "./PWA";
import { PageHeader } from "./PageHeader";
import { useUserPreferences } from "./UserPreferences";
import React, { useId, useState } from "react";
import { Check, ArrowUpRight, ALargeSmall, LogOut, Palette, ShieldCheck, User, Banknote, Globe } from "lucide-react";
import { confirmDialog } from "./ConfirmDialog";
import { useI18n } from "./I18n";
import { LOCALES, type Locale } from "../lib/i18n/config";
import { CountrySelect } from "./CountrySelect";
import { InlineSelectField } from "./fields";
import {
  countryByCode,
  countryFlag,
  currencyForCountry,
} from "../lib/countries";
import { FONT_SIZE_OPTIONS, useFontSize } from "./FontSize";
import { BACKGROUND_OPTIONS, THEME_OPTIONS, useTheme } from "./Theme";
import {
  CURRENCIES,
  MONEY_FORMATS,
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
  const preferences = useUserPreferences();
  const saveLabel = preferences?.saveState === "saving" ? "Kaydediliyor…" : preferences?.saveState === "error" ? "Kaydedilemedi" : preferences?.saveState === "saved" ? "Hesabına kaydedildi" : "Hesap tercihlerin";
  const { locale, direction, setLocale, t } = useI18n();
  const { size, setSize } = useFontSize();
  const { theme, setTheme, background, setBackground } = useTheme();
  const { currency, setCurrency, format, setFormat, defaultCountry, setDefaultCountry, currencyAuto, resetCurrencyAuto } = useCurrency();
  const groupId = useId();
  const [previewMessage, setPreviewMessage] = useState("");
  const currentTheme = THEME_OPTIONS.find((option) => option.id === theme)!;
  const countryCurrency = currencyForCountry(defaultCountry);
  const countryCurrencyLabel = CURRENCIES.find((o) => o.id === countryCurrency);

  return (
    <div className="w-full space-y-5 pb-8 font-sans text-uni-ink">
      <PageHeader pageId="appsettings" actions={<>
        <span className="text-sm text-uni-muted" role="status">{saveLabel}</span>
        {preferences?.saveState === "error" && <button type="button" className={`uni-control ${secondaryStyle}`} onClick={() => void preferences.flush()}>Yeniden dene</button>}
      </>} />

      <div className="mx-auto max-w-[720px] space-y-5">
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
          <span>{saveLabel}</span>
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

        <div className="my-6 border-t border-uni-border" />

        <fieldset>
          <legend className="text-xs font-medium text-uni-muted">Arka plan</legend>
          <p className="mt-1 text-xs text-uni-muted">Sitenin zemin rengi.</p>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-[20px] border border-uni-border p-1">
            {BACKGROUND_OPTIONS.map((option) => (
              <label key={option.id} className="relative flex min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl px-3 py-2 transition-colors hover:bg-uni-surface">
                <input
                  type="radio"
                  name={`${groupId}-background`}
                  value={option.id}
                  checked={background === option.id}
                  onChange={() => setBackground(option.id)}
                  className="peer sr-only"
                  aria-label={`${option.label} (${option.hint})`}
                />
                <span
                  aria-hidden="true"
                  className={`h-6 w-6 shrink-0 rounded-full ring-1 ring-inset ring-slate-900/10 peer-checked:ring-2 peer-checked:ring-brand-blue-600 peer-checked:ring-offset-1 ${option.id === "white" ? "bg-white" : "bg-[#f5f5f7]"}`}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-uni-ink">{option.label}</span>
                  <span className="block text-[11px] text-uni-muted">{option.hint}</span>
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
        <InlineSelectField
          label={t("language.title")}
          value={locale}
          onChange={(value) => setLocale(value)}
          options={(Object.keys(LOCALES) as Locale[]).map((code) => ({
            value: code,
            label: LOCALES[code].label,
          }))}
        />
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
        <InlineSelectField
          label="Para birimi"
          value={currency}
          onChange={(value) => setCurrency(value as typeof currency)}
          options={CURRENCIES.map((option) => ({
            value: option.id,
            label: `${option.symbol} ${option.id} · ${option.label}`,
          }))}
        />

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
          <span>{saveLabel}</span>
        </div>
      </section>

      <InstallAppPanel/>
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
        <p className="px-3 text-center text-xs leading-5 text-uni-muted">Tercihlerin kullanıcı hesabında saklanır; başka cihazlarda da hesabına giriş yaptığında uygulanır.</p>
      </div>
      </div>
    </div>
  );
}
