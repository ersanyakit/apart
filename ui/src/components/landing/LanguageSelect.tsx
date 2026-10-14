"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Languages, Search, X } from 'lucide-react';
import { LOCALES, type Locale } from '../../lib/i18n/config';
import { marketingLoaders } from '../../lib/i18n/marketing';
import { useMarketingI18n } from './MarketingI18n';
import styles from './Landing.module.css';

const normalize = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/ı/g, 'i');
const languageName = (locale: string, code: string) => {
  try { return new Intl.DisplayNames([locale], {type: 'language'}).of(code) || code; }
  catch { return LOCALES[code as Locale].label; }
};

export function LanguageSelect() {
  const { locale, m, selectLocale, loading, error } = useMarketingI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Locale>(locale);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const id = useId();
  const matches = useMemo(() => Object.entries(LOCALES).filter(([code]) => marketingLoaders[code as Locale]).map(([code, details]) => ({
    code: code as Locale, ...details, name: languageName(locale, code),
    search: normalize(`${code} ${details.label} ${languageName(locale, code)} ${languageName('en', code)} ${languageName('tr', code)}`),
  })).filter(item => item.search.includes(normalize(query.trim()))), [locale, query]);
  const enabled = matches.filter(item => marketingLoaders[item.code]);
  const highlighted = enabled.some(item => item.code === active) ? active : enabled[0]?.code;

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }
  function show() { setQuery(''); setActive(locale); setOpen(true); }
  function choose(value: Locale) { close(true); void selectLocale(value); }

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  useEffect(() => {
    if (open && highlighted) document.getElementById(`${id}-${highlighted}`)?.scrollIntoView({block:'nearest'});
  }, [open, highlighted, id]);

  return <div ref={root} className={styles.languageControl} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); }
  }}>
    <button ref={trigger} type="button" className={`${styles.languagePicker} uni-control`} disabled={loading}
      aria-label={`${m('Dil seçin')}: ${LOCALES[locale].label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`}
      onClick={() => open ? close() : show()} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); }
      }}>
      <Languages size={18} aria-hidden="true"/><span lang={locale}>{LOCALES[locale].label}</span>
      <ChevronDown size={14} aria-hidden="true" className={open ? styles.languageChevronOpen : undefined}/>
    </button>
    {open && <div className={styles.languagePanel}>
      <div className={styles.languagePanelHeading}><span>{m('Dil seçin')}</span><button type="button" className={`${styles.languageClose} nav-icon-button`} aria-label={m('Menüyü kapat')} onClick={() => close(true)}><X size={17} aria-hidden="true"/></button></div>
      <div className={styles.languageSearch}><Search size={17} aria-hidden="true"/><input ref={search} role="combobox" autoComplete="off" spellCheck={false}
        aria-label={m('Dil ara')} placeholder={m('Dil adı veya kodu…')} aria-expanded="true" aria-autocomplete="list" aria-controls={`${id}-list`} aria-activedescendant={highlighted ? `${id}-${highlighted}` : undefined}
        value={query} onChange={event => {setQuery(event.target.value); setActive(locale);}} onKeyDown={event => {
          if (['ArrowDown','ArrowUp'].includes(event.key) && enabled.length) {
            event.preventDefault();
            const current = enabled.findIndex(item => item.code === highlighted);
            setActive(enabled[(current + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length].code);
          } else if (event.key === 'Enter' && highlighted) { event.preventDefault(); choose(highlighted); }
        }}/></div>
      <div id={`${id}-list`} className={styles.languageList} role="listbox" aria-label={m('Dil seçin')}>
        {matches.map(item => <button key={item.code} id={`${id}-${item.code}`} type="button" role="option" tabIndex={-1}
          aria-selected={item.code === locale} disabled={!marketingLoaders[item.code]} data-highlighted={item.code === highlighted}
          className={`${styles.languageOption} uni-control`} onPointerDown={event => event.preventDefault()} onClick={() => choose(item.code)}>
          <span className={styles.languageCode} aria-hidden="true">{item.code.split('-')[0].toUpperCase()}</span>
          <span className={styles.languageNames}><span lang={item.code} dir={item.direction}>{item.label}</span><small>{item.name}</small></span>
          {item.code === locale && <Check size={17} aria-hidden="true"/>}
        </button>)}
      </div>
      {!matches.length && <p className={styles.languageEmpty} role="status">{m('Aramanıza uygun dil bulunamadı.')}</p>}
    </div>}
    <span className={loading ? styles.languageStatus : styles.visuallyHidden} role="status">{loading ? m('Dil değiştiriliyor…') : ''}</span>
    {error && <p className={styles.languageStatus} role="alert">{m('Dil yüklenemedi. Yeniden deneyin.')}</p>}
  </div>;
}
