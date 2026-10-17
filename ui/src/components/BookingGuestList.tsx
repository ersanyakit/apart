import { useGuestHistoryNavigation } from "./GuestHistoryNavigation";
import { Users, Phone } from 'lucide-react';
import type { Booking } from '../lib/api';
import { useI18n } from './I18n';
import { FLAG_ASSETS } from '../lib/flag-assets';
import { countryByCode, searchCountries } from '../lib/countries';
export function BookingGuestList({booking:b}:{booking:Booking}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const {locale}=useI18n();
 const openHistory=useGuestHistoryNavigation();
 const occupants=b.guests?.length?b.guests:[{name:b.guest_name,id:b.booking_id,phone:'',nationality:'',relationship:''}];
 return (      <section aria-labelledby="stay-guests-title">
        <div className="hc-guests-heading"><h3 id="stay-guests-title">{_uiText("Konaklayanlar")}</h3><span>{b.guest_count} {_uiText("kişi")}</span></div>
        <ul className="hc-guests">{occupants.map((guest, index) => {
          const country = countryByCode(guest.nationality, locale) ?? (guest.nationality ? searchCountries(guest.nationality, 1, locale)[0] : undefined);
          return <li key={guest.id || index}>
          <span className="hc-guest-avatar" aria-hidden="true">{guest.name?.trim().split(/\s+/).slice(0,2).map(part => part[0]).join('').toLocaleUpperCase(locale) || <Users size={21}/>}</span>
          <div className="hc-guest-content">
            <div className="hc-guest-heading"><strong>{openHistory && b.guests?.length && guest.id && guest.id !== '00000000-0000-0000-0000-000000000000' ? <button type="button" className="uni-control min-h-11 text-left text-brand-blue-700" title={_uiText("Misafir konaklama geçmişini aç")} onClick={()=>openHistory({id:guest.id,name:guest.name})}>{guest.name || _uiText("İsimsiz misafir")}</button> : guest.name || _uiText("İsimsiz misafir")}</strong>{guest.relationship && <span className="hc-guest-number">{guest.relationship}</span>}</div>
            {(guest.phone || guest.nationality) && <dl className="hc-guest-facts">
              {guest.phone && <div><dt className="sr-only">{_uiText("Telefon")}</dt><dd><Phone size={15} aria-hidden="true"/>{guest.phone}</dd></div>}
              {guest.nationality && <div><dt className="sr-only">{_uiText("Uyruk")}</dt><dd><img className="hc-guest-flag" src={FLAG_ASSETS[country?.code ?? "XX"] || FLAG_ASSETS.XX} width={22} height={22} alt="" aria-hidden="true"/>{country?.name || guest.nationality}</dd></div>}
            </dl>}
          </div>
        </li>;})}</ul>
      </section>);
}
