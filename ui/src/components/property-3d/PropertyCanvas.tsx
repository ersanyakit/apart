'use client';
import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Scan, ArrowDownToLine, PanelTop } from 'lucide-react';
import type { SceneFloor } from './model';
import type { CameraAction, createPropertyRenderer } from './scene';
import styles from './PropertyView.module.css';

type Engine = ReturnType<typeof createPropertyRenderer>;
const ACTIONS = [
  ['reset', 'Görünümü ortala', Scan], ['top', 'Üstten görünüm', ArrowDownToLine], ['front', 'Önden görünüm', PanelTop],
  ['left', 'Sola döndür', RotateCcw], ['right', 'Sağa döndür', RotateCw], ['in', 'Yakınlaştır', ZoomIn], ['out', 'Uzaklaştır', ZoomOut],
] as const;
export function PropertyCanvas({ floors, exploded, walls, selectedId, onSelect, onHover }: {
  floors: SceneFloor[]; exploded: boolean; walls: boolean; selectedId: string | null;
  onSelect: (id: string | null) => void; onHover: (id: string | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null), engine = useRef<Engine | null>(null);
  const current = useRef({ floors, exploded, walls, selectedId, onSelect, onHover });
  current.current = { floors, exploded, walls, selectedId, onSelect, onHover };
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    import('./scene').then(({ createPropertyRenderer }) => {
      if (cancelled || !host.current) return;
      const instance = createPropertyRenderer(host.current, {
        select: id => current.current.onSelect(id), hover: id => current.current.onHover(id),
        failure: () => { if (!cancelled) setStatus('error'); },
      });
      engine.current = instance;
      const value = current.current;
      instance.update(value.floors, value.exploded, value.walls); instance.select(value.selectedId);
      setStatus('ready');
    }).catch(() => { if (!cancelled) { engine.current?.dispose(); engine.current = null; setStatus('error'); } });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, [attempt]);
  useEffect(() => {
    try { engine.current?.update(floors, exploded, walls); }
    catch { engine.current?.dispose(); engine.current = null; setStatus('error'); }
  }, [floors, exploded, walls]);
  useEffect(() => { engine.current?.select(selectedId); }, [selectedId]);
  function action(value: CameraAction) { if (status === 'ready') engine.current?.action(value); }
  return <div className={styles.stage}>
    <div ref={host} className={styles.canvas} role="img" aria-label="Tesisin etkileşimli 3 boyutlu kat planı. Birimleri oda seçimi alanından da seçebilirsiniz." />
    {status === 'loading' && <div className={styles.overlay} role="status">3 boyutlu görünüm hazırlanıyor…</div>}
    {status === 'error' && <div className={styles.overlay} role="alert"><strong>3 boyutlu görünüm açılamadı.</strong><p>Tarayıcınızın WebGL desteğini kontrol edin. Oda ve yatak bilgilerine aşağıdaki seçim alanından ulaşabilirsiniz.</p><button type="button" className="uni-button uni-button-secondary rounded-full" onClick={() => setAttempt(v => v + 1)}>Yeniden dene</button></div>}
    <div className={styles.cameraControls} role="group" aria-label="3 boyutlu kamera kontrolleri">
      {ACTIONS.map(([value, label, Icon]) => <button key={value} type="button" className="nav-icon-button" disabled={status !== 'ready'} title={label} aria-label={label} onClick={() => action(value)}><Icon size={19} aria-hidden="true" /></button>)}
    </div>
    <p className={styles.gestureHint}>Sürükle: döndür · Sağ tuş: kaydır · Tekerlek / iki parmak: yakınlaştır</p>
  </div>;
}
