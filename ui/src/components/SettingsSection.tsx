import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './SettingsSection.module.css';

/** Native keyboard-accessible disclosure; fields stay mounted while collapsed. */
export function SettingsSection({title,description,children}: {title:string;description?:string;children:ReactNode}) {
 return <details className={styles.section}><summary><span><strong>{title}</strong>{description&&<small>{description}</small>}</span><span className={styles.chevron}><ChevronDown size={17} strokeWidth={1.8}/></span></summary><div className={styles.content}>{children}</div></details>;
}
