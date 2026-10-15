import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2, Search } from 'lucide-react';
import { FieldCard, FieldCaption } from './FieldCard';
import { useI18n } from '../I18n';
import { getCountries, normalizeCountrySearch } from '../../lib/countries';
import { FLAG_ASSETS } from '../../lib/flag-assets';
import { formatNationalPhone, parsePhone, phoneCountry, phoneDigits, phonePlans } from '../../lib/phone';
import styles from './PhoneField.module.css';

/** Application-owned telephone field. Value may be incomplete while editing; forms validate on submit. */
export function PhoneField({ label = 'Telefon', value, onChange, defaultCountry = 'TR', required = false, disabled = false, tone = 'surface' }: {
  label?: string; value: string; onChange: (value: string) => void; defaultCountry?: string;
  required?: boolean; disabled?: boolean; tone?: 'white' | 'surface';
}) {
  const { locale } = useI18n();
  const [override, setOverride] = useState<string>();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const phone = parsePhone(value, override || defaultCountry);
  const country = phone.country;
  const plan = phonePlans[country];
  const display = phone.e164 ? formatNationalPhone(phone.national, country) : value;
  const error = required && phone.empty ? 'Telefon numarası girin.' : phone.error;
  const countries = useMemo(() => getCountries(locale).filter(c => phonePlans[c.code]), [locale]);
  const selected = countries.find(c => c.code === country);
  const query = normalizeCountrySearch(search, locale).replace(/^\+/, '');
  const matches = countries.filter(c => !query || normalizeCountrySearch(`${c.name} ${c.code}`, locale).includes(query) || phonePlans[c.code].callingCode.startsWith(query));
  useEffect(() => { input.current?.setCustomValidity(error); }, [error]);
  useEffect(() => {
    if (!open) return;
    searchInput.current?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => { if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({block:'nearest'}); }, [active, open, id]);

  const change = (text: string, cursor: number) => {
    const next = parsePhone(text, country);
    // Explicit international input may select another telephone country without changing nationality.
    if (next.country !== country) setOverride(next.country);
    const output = next.e164 || text;
    const formatted = next.e164 ? formatNationalPhone(next.national, next.country) : text;
    const atEnd = cursor === text.length;
    let digits = (phoneDigits(text.slice(0, cursor)).match(/\d/g) || []).length;
    const removed = (phoneDigits(text).match(/\d/g) || []).length - (formatted.match(/\d/g) || []).length;
    digits = Math.max(0, digits - Math.max(0, removed));
    onChange(output);
    requestAnimationFrame(() => {
      if (!input.current || document.activeElement !== input.current) return;
      let position = 0, seen = 0;
      while (position < formatted.length && seen < digits) { if (/\d/.test(formatted[position])) seen++; position++; }
      input.current.setSelectionRange(atEnd ? formatted.length : position, atEnd ? formatted.length : position);
    });
  };
  const pick = (code: string) => {
    setOverride(phoneCountry(code));
    if (value) onChange('+' + phonePlans[code].callingCode + phone.national.replace(/\D/g, ''));
    setOpen(false); setSearch(''); setActive(0);
    input.current?.focus();
  };
  return <div ref={root} className={styles.root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <FieldCard className={tone === 'white' ? 'h-full bg-white' : 'h-full'}>
      <label htmlFor={id}><FieldCaption>{label}</FieldCaption></label>
      <div className={styles.row}>
        <button ref={trigger} type="button" disabled={disabled} className={styles.country} aria-label={`${label} ülkesi: ${selected?.name || country}, +${plan.callingCode}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-countries`} onClick={() => {setOpen(!open); setSearch(''); setActive(0);}}>
          {FLAG_ASSETS[country] ? <img src={FLAG_ASSETS[country]} alt=""/> : <Globe2 size={20} aria-hidden="true"/>}
          <span>+{plan.callingCode}</span><ChevronDown size={13} aria-hidden="true"/>
        </button>
        <input ref={input} id={id} aria-label={label} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required={required} disabled={disabled} value={display}
          placeholder={formatNationalPhone(plan.example, country)} aria-describedby={`${id}-hint`} aria-invalid={touched && !!error}
          onChange={event => change(event.target.value, event.target.selectionStart ?? event.target.value.length)}
          onBlur={() => setTouched(true)} onInvalid={() => setTouched(true)}
          onKeyDown={event => {
            const field = event.currentTarget, caret = field.selectionStart ?? 0;
            if (field.selectionEnd !== caret || !['Backspace', 'Delete'].includes(event.key)) return;
            const backwards = event.key === 'Backspace';
            let at = backwards ? caret - 1 : caret;
            if (at < 0 || at >= display.length || /\d/.test(display[at])) return;
            while (at >= 0 && at < display.length && !/\d/.test(display[at])) at += backwards ? -1 : 1;
            if (at >= 0 && at < display.length) { event.preventDefault(); change(display.slice(0, at) + display.slice(at + 1), backwards ? at : caret); }
          }}/>
      </div>
      <p id={`${id}-hint`} className={styles.hint} data-error={touched && !!error || undefined} aria-live="polite">{touched && error ? error : `Örnek: +${plan.callingCode} ${formatNationalPhone(plan.example, country)}`}</p>
      {open && <div className={styles.picker}>
        <div className={styles.search}><Search size={16} aria-hidden="true"/><input ref={searchInput} role="combobox" aria-label="Telefon ülkesi ara" aria-expanded="true" aria-controls={`${id}-countries`} aria-autocomplete="list" aria-activedescendant={matches.length ? `${id}-option-${active}` : undefined} value={search} placeholder="Ülke veya telefon kodu ara" onChange={e => {setSearch(e.target.value); setActive(0);}} onKeyDown={event => {
          if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {event.preventDefault();setActive(n => event.key === 'Home' ? 0 : event.key === 'End' ? Math.max(0,matches.length-1) : Math.max(0,Math.min(matches.length-1,n+(event.key==='ArrowDown'?1:-1))));}
          if (event.key === 'Enter') {event.preventDefault();if(matches[active])pick(matches[active].code);}
        }}/></div>
        <div id={`${id}-countries`} role="listbox" aria-label="Telefon ülkeleri" className={styles.options}>
          {matches.map((c,index) => <button key={c.code} id={`${id}-option-${index}`} type="button" role="option" aria-selected={country===c.code} data-active={active===index || undefined} onMouseDown={e => e.preventDefault()} onClick={() => pick(c.code)}>
            {FLAG_ASSETS[c.code] && <img src={FLAG_ASSETS[c.code]} alt=""/>}<span>{c.name}</span><small>+{phonePlans[c.code].callingCode}</small>{country===c.code && <Check size={15} aria-hidden="true"/>}
          </button>)}
          {!matches.length && <p className={styles.hint}>Ülke bulunamadı.</p>}
        </div>
      </div>}
    </FieldCard>
  </div>;
}
