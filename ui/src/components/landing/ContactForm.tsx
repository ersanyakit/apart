"use client";
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import styles from './MarketingPages.module.css';
import shared from './Landing.module.css';
export function ContactForm({email,subject}: {email:string;subject:string}){
 const [opened,setOpened]=useState(false);
 return <form className={styles.form} onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);const body=`Ad soyad: ${data.get('name')}\nE-posta: ${data.get('email')}\nTesis: ${data.get('property')}\n\n${data.get('message')}`;window.location.href=`mailto:${email}?subject=${encodeURIComponent(String(data.get('subject')))}&body=${encodeURIComponent(body)}`;setOpened(true);}}><h2>Bize yazın.</h2><label>Ad soyad<input name="name" autoComplete="name" required maxLength={120}/></label><label>E-posta<input name="email" type="email" autoComplete="email" required maxLength={180}/></label><label>Tesis adı <span>(isteğe bağlı)</span><input name="property" autoComplete="organization" maxLength={180}/></label><label>Konu<input name="subject" defaultValue={subject || 'Interactiveotel hakkında bilgi'} required maxLength={180}/></label><label>Mesajınız<textarea name="message" required maxLength={3000} placeholder="Tesisinizden ve ihtiyaçlarınızdan bahsedin."/></label><p>Bu form e-posta uygulamanızda bir taslak açar. Mesajı oradan gönderebilirsiniz.</p><button className={`${shared.button} uni-control`} type="submit">E-posta taslağını aç <ArrowUpRight size={18}/></button>{opened&&<p role="status">E-posta uygulamanız açılmadıysa doğrudan {email} adresine yazabilirsiniz.</p>}</form>
}
