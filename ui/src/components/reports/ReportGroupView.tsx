import { useI18n } from "../I18n";
import { ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../PageHeader';
import { NavigationIcon } from '../NavigationIcon';
import { reportPageID, type ReportGroup } from './navigation';
import { reportArtwork } from './artwork';
import styles from './ReportGroupView.module.css';

export function ReportGroupView({ group, onSelect }: { group: ReportGroup; onSelect: (page: string) => void }) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  return <section className="space-y-6" aria-label={_uiText("{value1} raporları", {value1: String(_uiText(group.name))})}>
    <PageHeader pageId={group.id} actions={<span className="text-sm text-uni-muted">{group.reports.length} {_uiText("rapor")}</span>} />
    <div className={styles.grid}>
      {group.reports.map((report, index) => {
        const artwork=reportArtwork[report.key];
        return <button key={report.key} type="button" className={`uni-control ${styles.tile}`}
          aria-label={_uiText(report.name)} onClick={() => onSelect(reportPageID(report.key))}>
          <span className={styles.artwork} aria-hidden="true">
            {artwork&&<img src={artwork.src} srcSet={`${artwork.small} 384w, ${artwork.src} 768w`} sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1100px) 45vw, 360px" width="768" height="512" alt="" loading={index<3?"eager":"lazy"} decoding="async"/>}
            <span className={styles.icon}><NavigationIcon name={reportPageID(report.key)} /></span>
            <span className={styles.arrow}><ArrowUpRight size={19} strokeWidth={1.8}/></span>
          </span>
          <span className={styles.copy}>
            <span className={styles.title}>{_uiText(report.name)}</span>
            <span className={styles.description}>{_uiText(report.description)}</span>
            <span className={styles.link} aria-hidden="true">{_uiText("Raporu görüntüle")} <span>→</span></span>
          </span>
        </button>;
      })}
    </div>
  </section>;
}
