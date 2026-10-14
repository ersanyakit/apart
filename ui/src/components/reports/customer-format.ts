import {FLAG_ASSETS} from '../../lib/flag-assets';
export function customerCountry(value:string) {
 const code=value.trim().toUpperCase();
 if(!/^[A-Z]{2}$/.test(code))return {code,label:value||'Belirtilmemiş',flagSrc:FLAG_ASSETS.XX};
 let label=code;
 try {label=new Intl.DisplayNames(['tr'],{type:'region',fallback:'none'}).of(code)||code} catch { /* Keep the recorded code. */ }
 return {code,label,flagSrc:FLAG_ASSETS[code]||FLAG_ASSETS.XX};
}
