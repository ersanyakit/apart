"use client";
import { useMarketingI18n } from "./MarketingI18n";
import { SectionArtwork } from './SectionArtwork';
import styles from './MarketingPages.module.css';
import shared from './Landing.module.css';
export function PageIntro({eyebrow,title,description,image,alt}: {eyebrow:string;title:string;description:string;image:string;alt:string}) {
 const { m } = useMarketingI18n();
 return <section className={styles.hero}><div><p className={shared.eyebrow}>{m(eyebrow)}</p><h1>{m(title)}</h1><p>{m(description)}</p></div><SectionArtwork name={image} alt={m(alt)}/></section>;
}
