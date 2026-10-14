import { SectionArtwork } from './SectionArtwork';
import styles from './MarketingPages.module.css';
import shared from './Landing.module.css';
export function PageIntro({eyebrow,title,description,image,alt}: {eyebrow:string;title:string;description:string;image:string;alt:string}) {
 return <section className={styles.hero}><div><p className={shared.eyebrow}>{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><SectionArtwork name={image} alt={alt}/></section>;
}
