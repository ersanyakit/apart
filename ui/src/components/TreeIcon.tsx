import type { StaticImageData } from "next/image";
import housePng from "../assets/icons/house.png";
import datePng from "../assets/icons/date.png";
import bookPng from "../assets/icons/book.png";
import groupPng from "../assets/icons/group.png";
import findPng from "../assets/icons/find.png";
import cogPng from "../assets/icons/cog.png";
import buildingPng from "../assets/icons/building.png";
import doorOpenPng from "../assets/icons/door_open.png";
import userSuitPng from "../assets/icons/user_suit.png";
import pageCopyPng from "../assets/icons/page_copy.png";
import reportPng from "../assets/icons/report.png";
import starPng from "../assets/icons/star.png";
import mapPng from "../assets/icons/map.png";
import wrenchPng from "../assets/icons/wrench.png";

/** Sol menü ağacı için PNG ikon haritası (src/assets/icons — Silk 16px seti). */
export const treePng = {
  operations: housePng,
  board: datePng,
  bookings: bookPng,
  stays: groupPng,
  guests: findPng,
  settings: cogPng,
  facility: buildingPng,
  units: doorOpenPng,
  staff: userSuitPng,
  templates: pageCopyPng,
  logs: reportPng,
  features: starPng,
  map: mapPng,
  appSettings: wrenchPng,
} satisfies Record<string, StaticImageData>;

export type TreePngKey = keyof typeof treePng;

/** Ağaçta sabit boyutla crisp render eden dekoratif ikon. */
export function TreeIcon({
  src,
  alt,
  size = 16,
}: {
  src: StaticImageData;
  alt: string;
  size?: 16 | 20;
}) {
  return (
    <img
      src={src.src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={size === 20 ? "h-5 w-5 shrink-0 select-none" : "h-4 w-4 shrink-0 select-none"}
    />
  );
}
