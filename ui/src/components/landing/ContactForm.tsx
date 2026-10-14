"use client";
import { useMarketingI18n } from "./MarketingI18n";
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import styles from './MarketingPages.module.css';
import shared from './Landing.module.css';
export function ContactForm({email,subject}: {email:string;subject:string}){
 const { m } = useMarketingI18n();
 const [opened,setOpened]=useState(false);
 return <form className={styles.form} onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);const body=m('Ad soyad: {name}\nE-posta: {email}\nTesis: {property}\n\n{message}',{name:String(data.get('name')),email:String(data.get('email')),property:String(data.get('property')),message:String(data.get('message'))});window.location.href=`mailto:${email}?subject=${encodeURIComponent(String(data.get('subject')))}&body=${encodeURIComponent(body)}`;setOpened(true);}}><h2>{m("Bize yazın.")}</h2><label>{m("Ad soyad")}<input name="name" autoComplete="name" required maxLength={120}/></label><label>{m("E-posta")}<input name="email" type="email" autoComplete="email" required maxLength={180}/></label><label>{m("Tesis adı")}<span>{m("(isteğe bağlı)")}</span><input name="property" autoComplete="organization" maxLength={180}/></label><label>{m("Konu")}<input name="subject" key={subject} defaultValue={subject || m('Interactiveotel hakkında bilgi')} required maxLength={180}/></label><label>{m("Mesajınız")}<textarea name="message" required maxLength={3000} placeholder={m("Tesisinizden ve ihtiyaçlarınızdan bahsedin.")}/></label><p>{m("Bu form e-posta uygulamanızda bir taslak açar. Mesajı oradan gönderebilirsiniz.")}</p><button className={`${shared.button} uni-control`} type="submit">{m("E-posta taslağını aç")}<ArrowUpRight size={18}/></button>{opened&&<p role="status">{m("E-posta uygulamanız açılmadıysa doğrudan {email} adresine yazabilirsiniz.",{email})}</p>}</form>
}
