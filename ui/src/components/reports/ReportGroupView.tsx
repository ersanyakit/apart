import { ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../PageHeader';
import { NavigationIcon } from '../NavigationIcon';
import { reportPageID, type ReportGroup } from './navigation';
import styles from './ReportGroupView.module.css';

export function ReportGroupView({ group, onSelect }: { group: ReportGroup; onSelect: (page: string) => void }) {
  return <section className="space-y-6" aria-label={`${group.name} raporları`}>
    <PageHeader pageId={group.id} actions={<span className="text-sm text-uni-muted">{group.reports.length} rapor</span>} />
    <div className={styles.grid}>
      {group.reports.map((report, index) => <button key={report.key} type="button"
        className={`uni-control ${styles.tile}`} data-tone={index % 3}
        aria-label={report.name} onClick={() => onSelect(reportPageID(report.key))}>
        <span className={styles.top} aria-hidden="true">
          <span className={styles.icon}><NavigationIcon name={reportPageID(report.key)} /></span>
          <ArrowUpRight size={21} strokeWidth={1.8} />
        </span>
        <span className={styles.title}>{report.name}</span>
        <span className={styles.description}>{report.description}</span>
        <span className={styles.link} aria-hidden="true">Raporu görüntüle <span>→</span></span>
      </button>)}
    </div>
  </section>;
}
