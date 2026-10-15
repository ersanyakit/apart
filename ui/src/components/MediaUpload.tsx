import { useRef, useState } from 'react';
import { UploadCloud, LoaderCircle, Film } from 'lucide-react';
import { messageOf } from '../lib/api';
import styles from './MediaUpload.module.css';

const accepted = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
type Preview = { name: string; url: string; video: boolean };

/** Shared file selection and drop surface. Storage and gallery ownership stay with MediaEditor. */
export function MediaUpload({ disabled, count, onUpload }: {
  disabled?: boolean; count: number; onUpload: (files: File[]) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<Preview[]>([]);
  const [error, setError] = useState('');
  const busy = pending.length > 0;
  const upload = async (files: File[]) => {
    if (disabled || locked.current || !files.length) return;
    setError('');
    if (files.length > 10 || count + files.length > 30) {
      setError('Tek seferde en fazla 10 dosya yükleyebilirsiniz. Galeri toplam 30 dosya içerebilir.'); return;
    }
    for (const file of files) {
      if (!accepted.includes(file.type)) { setError(`${file.name}: JPG, PNG, GIF, WebP, MP4 veya WebM seçin.`); return; }
      const max = file.type.startsWith('image/') ? 10 : 50;
      if (!file.size || file.size > max * 1024 * 1024) { setError(`${file.name}: Dosya boş olmamalı ve ${max} MB sınırını aşmamalı.`); return; }
    }
    locked.current = true;
    const previews = files.map(file => ({ name: file.name, url: URL.createObjectURL(file), video: file.type.startsWith('video/') }));
    setPending(previews);
    try { await onUpload(files); }
    catch (e) { setError(messageOf(e)); }
    finally { previews.forEach(p => URL.revokeObjectURL(p.url)); setPending([]); locked.current = false; }
  };
  return <div className={styles.root}>
    <div className={`${styles.drop} ${dragging ? styles.dragging : ''}`} aria-busy={busy}
      onDragEnter={e => { e.preventDefault(); if (!disabled && !busy) { depth.current++; setDragging(true); } }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = disabled || busy ? 'none' : 'copy'; }}
      onDragLeave={e => { e.preventDefault(); if (--depth.current <= 0) setDragging(false); }}
      onDrop={e => { e.preventDefault(); depth.current = 0; setDragging(false); void upload(Array.from(e.dataTransfer.files)); }}>
      <span className={styles.icon}><UploadCloud size={26}/></span>
      <strong>{busy ? 'Dosyalar yükleniyor…' : 'Görsellerinizi ve videolarınızı buraya bırakın'}</strong>
      <p>JPG, PNG, GIF, WebP · En fazla 10 MB<br/>MP4, WebM · En fazla 50 MB</p>
      <button type="button" className={`uni-control ${styles.choose}`} disabled={disabled || busy || count >= 30} onClick={() => input.current?.click()}>
        {busy ? <LoaderCircle size={16} className={styles.spinner}/> : <UploadCloud size={16}/>} {busy ? 'Yükleniyor' : 'Dosya seç'}
      </button>
      <input ref={input} className="sr-only" tabIndex={-1} type="file" multiple accept={accepted.join(',')} aria-label="Medya dosyalarını yükle" disabled={disabled || busy || count >= 30}
        onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ''; void upload(files); }}/>
      <small>{count} / 30 dosya · Tek seferde 10 dosya</small>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {busy && <div className={styles.queue} role="status" aria-live="polite">
      {pending.map((p,i) => <div key={i} className={styles.item}>
        {p.video ? <Film size={24}/> : <img src={p.url} alt=""/>}
        <span>{p.name}<small>Yükleniyor…</small></span><LoaderCircle size={18} className={styles.spinner}/>
      </div>)}
    </div>}
  </div>;
}
