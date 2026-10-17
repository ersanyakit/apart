import { useEffect, useRef } from 'react';
import { ROOM_GRADIENT_PALETTES, ROOM_GRADIENT_SIZE, roomGradientPixels, type RoomGradientKey } from '../lib/room-gradient';

type Tile = {canvas: HTMLCanvasElement; card: HTMLElement; root: HTMLElement | null; colors: readonly string[]; seed: number; visible: boolean; lastPhase?: number};
const tiles = new Map<Element, Tile>();
let frame = 0;
let intersection: IntersectionObserver | undefined;
let resize: ResizeObserver | undefined;
let motion: MediaQueryList | undefined;
function schedule() { if (!frame) frame = requestAnimationFrame(paint); }
function onScroll() { if (!motion?.matches) schedule(); }
function paint() {
  frame = 0;
  const roots = new Map<HTMLElement, DOMRect>();
  for (const tile of tiles.values()) {
    if (!tile.visible) continue;
    const rect = tile.card.getBoundingClientRect();
    let viewport: {top: number; height: number; left: number; width: number} = {top:0,height:innerHeight,left:0,width:innerWidth};
    if (tile.root) {
      if (!roots.has(tile.root)) roots.set(tile.root,tile.root.getBoundingClientRect());
      viewport = roots.get(tile.root)!;
    }
    if (rect.bottom < viewport.top || rect.top > viewport.top + viewport.height) continue;
    const phase = tile.seed + (motion?.matches ? 0 : (rect.top + rect.height / 2 - viewport.top) / Math.max(1,viewport.height) * 2 + (rect.left - viewport.left) / Math.max(1,viewport.width) * .8);
    if (tile.lastPhase !== undefined && Math.abs(tile.lastPhase - phase) < .008) continue;
    const ctx = tile.canvas.getContext('2d', {alpha:false});
    if (!ctx) continue;
    const data = ctx.createImageData(ROOM_GRADIENT_SIZE, ROOM_GRADIENT_SIZE);
    data.data.set(roomGradientPixels(tile.colors,phase));
    ctx.putImageData(data,0,0); tile.lastPhase = phase;
  }
}
function register(tile: Tile) {
  if (!tiles.size) {
    motion = matchMedia('(prefers-reduced-motion: reduce)');
    motion.addEventListener('change',schedule);
    document.addEventListener('scroll',onScroll,{capture:true,passive:true});
    window.addEventListener('resize',schedule,{passive:true});
    intersection = new IntersectionObserver(entries => {
      for (const entry of entries) { const item = tiles.get(entry.target); if (item) item.visible = entry.isIntersecting; }
      schedule();
    });
    resize = new ResizeObserver(schedule);
  }
  tiles.set(tile.card,tile); intersection?.observe(tile.card); resize?.observe(tile.card); schedule();
  return () => {
    intersection?.unobserve(tile.card); resize?.unobserve(tile.card); tiles.delete(tile.card);
    if (!tiles.size) {
      intersection?.disconnect(); resize?.disconnect(); motion?.removeEventListener('change',schedule);
      document.removeEventListener('scroll',onScroll,true); window.removeEventListener('resize',schedule);
      cancelAnimationFrame(frame); frame = 0;
    }
  };
}
export function RoomGradient({status, roomId, className}: {status: RoomGradientKey; roomId: string; className: string}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, card = canvas?.parentElement;
    if (!canvas || !card) return;
    // Stable per-room phase also gives adjacent cards distinct color placement.
    const seed = Array.from(roomId).reduce((hash,char)=>(hash * 31 + char.charCodeAt(0)) >>> 0,0) % 800 / 100;
    return register({canvas,card,root:card.closest('main'),colors:ROOM_GRADIENT_PALETTES[status],seed,visible:true});
  },[status,roomId]);
  return <canvas ref={ref} width={ROOM_GRADIENT_SIZE} height={ROOM_GRADIENT_SIZE} className={className} data-room-gradient={status} aria-hidden="true"/>;
}
