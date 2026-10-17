import { Bell, Search, X, MapPin, ClipboardList } from 'lucide-react';
import definitions from '../lib/navigation-icons.json';

// One artwork map for desktop sidebar, page tabs and mobile navigation.
const artwork = (name: string) => `/images/navigation-dott-simple/${name}.avif`;
export const NAVIGATION_ARTWORK: Record<string, string> = Object.fromEntries(
  Object.entries(definitions.pages).map(([key, name]) => [key, artwork(name)]),
);
const REPORT_ARTWORK: Record<string, string> = Object.fromEntries(
  Object.entries(definitions.reports).map(([key, name]) => [key, artwork(name)]),
);
export function navigationArtwork(name: string): string | undefined {
  if (name.startsWith('report.') || name.startsWith('report-group.')) return REPORT_ARTWORK[name.split('.')[1]] ?? NAVIGATION_ARTWORK.reports;
  const key = name.startsWith('customer:') || name.startsWith('guest-history:') ? 'guests' : name.startsWith('booking:') ? 'bookings' : name;
  return NAVIGATION_ARTWORK[key];
}
export function NavigationIcon({name, size = 21}: {name: string; size?: number}) {
  const src = navigationArtwork(name);
  if (src) return <img src={src} width={size} height={size} alt="" aria-hidden="true" draggable={false} className="navigation-artwork shrink-0" style={{width:`var(--navigation-icon-size, ${size}px)`,height:`var(--navigation-icon-size, ${size}px)`,objectFit:'contain'}}/>;
  const Icon = ({search:Search,close:X,notifications:Bell,map:MapPin})[name] ?? ClipboardList;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" className="shrink-0"/>;
}
