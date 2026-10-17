import React from 'react';
import { STATUS_PALETTE, roomStatusKey, type SemanticStatus } from '../lib/status-palette';

// Room condition artwork and labels are shared by every screen.
export const ROOM_CONDITION_ICONS: Partial<Record<keyof typeof STATUS_PALETTE, string>> = {
  occupied: '/images/room-status-dott/occupied.avif',
  reserved: '/images/room-status-dott/reserved.avif',
  clean: '/images/room-status-dott/clean.avif',
  dirty: '/images/room-status-dott/dirty.avif',
  maintenance: '/images/room-status-dott/maintenance.avif',
  fault: '/images/room-status-dott/fault.avif',
  available: '/images/room-status-dott/available.avif',
};

export function RoomConditionIcon({status, size = 24, semantic}: {status?: string; size?: number; semantic?: SemanticStatus}) {
  const key = semantic ?? roomStatusKey(status ?? ""), palette = STATUS_PALETTE[key];
  const src = ROOM_CONDITION_ICONS[key];
  return src ? <img src={src} width={size} height={size} alt="" aria-hidden="true" draggable={false} style={{display:'inline-block', width:size, height:size, objectFit:'contain', flexShrink:0, verticalAlign:'middle'}}/> : <span aria-hidden="true" style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:palette.accent,flexShrink:0}}/>;
}

export function RoomCondition({status, size = 24, iconOnly = false}: {status: string; size?: number; iconOnly?: boolean}) {
  const palette = STATUS_PALETTE[roomStatusKey(status)];
  return <span title={palette.label} aria-label={iconOnly ? palette.label : undefined} style={{display:'inline-flex',alignItems:'center',gap:6,color:palette.text,verticalAlign:'middle'}}><RoomConditionIcon status={status} size={size}/>{!iconOnly && <span>{palette.label}</span>}</span>;
}
