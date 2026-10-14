'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Move, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, PanelRightClose, PanelRightOpen, RotateCcw, RotateCw, ZoomIn, ZoomOut, Scan, ArrowDownToLine, PanelTop } from 'lucide-react';
import { useTheme, THEME_OPTIONS } from '../Theme';
import type { SceneFloor } from './model';
import type { CameraAction, createPropertyRenderer } from './scene';
import styles from './PropertyView.module.css';

type Engine = ReturnType<typeof createPropertyRenderer>;
const ACTIONS = [
  ['reset', 'Görünümü ortala', Scan], ['top', 'Üstten görünüm', ArrowDownToLine], ['front', 'Önden görünüm', PanelTop],
  ['pan-left', 'Kamerayı sola kaydır', ArrowLeft], ['pan-right', 'Kamerayı sağa kaydır', ArrowRight], ['pan-up', 'Kamerayı yukarı kaydır', ArrowUp], ['pan-down', 'Kamerayı aşağı kaydır', ArrowDown],
  ['left', 'Sola döndür', RotateCcw], ['right', 'Sağa döndür', RotateCw], ['in', 'Yakınlaştır', ZoomIn], ['out', 'Uzaklaştır', ZoomOut],
] as const;
export function PropertyCanvas({ floors, exploded, walls, selectedId, onSelect, onHover, panelOpen, onTogglePanel, details, floorControls, focusRequest }: {
  floors: SceneFloor[]; exploded: boolean; walls: boolean; selectedId: string | null;
  onSelect: (id: string | null) => void; onHover: (id: string | null) => void;
  panelOpen: boolean; onTogglePanel: () => void;
  focusRequest?: { id: string; version: number };
  details: React.ReactNode; floorControls?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const accent = THEME_OPTIONS.find(option => option.id === theme)?.color || THEME_OPTIONS[0].color;
  const host = useRef<HTMLDivElement>(null), engine = useRef<Engine | null>(null);
  const current = useRef({ floors, exploded, walls, selectedId, onSelect, onHover, accent });
  current.current = { floors, exploded, walls, selectedId, onSelect, onHover, accent };
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [panMode, setPanMode] = useState(false);
  const panModeRef = useRef(panMode); panModeRef.current = panMode;
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
      engine.current = instance; instance.setPanMode(panModeRef.current);
      const value = current.current;
      instance.update(value.floors, value.exploded, value.walls, value.accent); instance.select(value.selectedId);
      setStatus('ready');
    }).catch(() => { if (!cancelled) { engine.current?.dispose(); engine.current = null; setStatus('error'); } });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, [attempt]);
  useEffect(() => {
    try { engine.current?.update(floors, exploded, walls, accent); }
    catch { engine.current?.dispose(); engine.current = null; setStatus('error'); }
  }, [floors, exploded, walls, accent]);
  useEffect(() => { engine.current?.select(selectedId); }, [selectedId]);
  useEffect(() => { if (status === 'ready' && focusRequest) engine.current?.focus(focusRequest.id); }, [focusRequest, status]);
  useEffect(() => { engine.current?.setPanMode(panMode); }, [panMode]);
  function action(value: CameraAction) { if (status === 'ready') engine.current?.action(value); }
  const PanelIcon = panelOpen ? PanelRightClose : PanelRightOpen;
  return <div className={`${styles.stage} property-stage`}>
    <div ref={host} className={styles.canvas} role="img" aria-label="Tesisin etkileşimli 3 boyutlu kat planı. Birimleri oda seçimi alanından da seçebilirsiniz." />
    {status === 'loading' && <div className={styles.overlay} role="status">3 boyutlu görünüm hazırlanıyor…</div>}
    {status === 'error' && <div className={styles.overlay} role="alert"><strong>3 boyutlu görünüm açılamadı.</strong><p>Tarayıcınızın WebGL desteğini kontrol edin. Oda ve yatak bilgilerine aşağıdaki seçim alanından ulaşabilirsiniz.</p><button type="button" className="uni-button uni-button-secondary rounded-full" onClick={() => setAttempt(v => v + 1)}>Yeniden dene</button></div>}
    <div className={styles.stageTools} role="group" aria-label="Görünüm araçları">
      <button type="button" className="nav-icon-button" aria-expanded={panelOpen} aria-label={panelOpen ? 'Bilgi panelini gizle' : 'Bilgi panelini göster'} title={panelOpen ? 'Bilgi panelini gizle' : 'Bilgi panelini göster'} onClick={onTogglePanel}><PanelIcon size={19} aria-hidden="true" /></button>
    </div>
    {floorControls}
    {details}
    <div className={styles.cameraControls} role="group" aria-label="3 boyutlu kamera kontrolleri">
      <button type="button" className="nav-icon-button" disabled={status !== 'ready'} aria-pressed={panMode} aria-label="Sürükleyerek kaydır" title="Sürükleyerek kaydır" onClick={() => setPanMode(value => !value)}><Move size={19} aria-hidden="true" /></button>
      {ACTIONS.map(([value, label, Icon]) => <button key={value} type="button" className="nav-icon-button" disabled={status !== 'ready'} title={label} aria-label={label} onClick={() => action(value)}><Icon size={19} aria-hidden="true" /></button>)}
    </div>
    <p className={styles.gestureHint}>{panMode ? 'Sürükle: kaydır' : 'Sürükle: döndür'} · Sağ tuş / Shift + sürükle: kaydır · İki parmak: kaydır / yakınlaştır</p>
  </div>;
}
