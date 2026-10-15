import { RoomStatus as RoomState } from '../lib/statuses.generated';
import { boardStatusKey, statusStyle, roomStatusKey, STATUS_PALETTE } from "../lib/status-palette";
import React, { useState, useEffect, useRef } from "react";
import {
  command,
  messageOf,
  localized,
  unitKinds,
  type APIRoom,
  type Snapshot,
  type Position,
  type Booking,
} from "../lib/api";
import { roomBoardState } from "../lib/room-board";
import { buttonStyle, secondaryStyle, ErrorMessage } from "./FormKit";
export function FloorBoard({
  snapshot,
  floorId,
  at,
  onEdit,
  onBook,
  onRefresh,
  canManage,
  day,
  onOpenBooking,
}: {
  snapshot: Snapshot;
  floorId: string;
  at: string;
  /** Verilirse (tanımlar ekranı) boş birime tıklayınca düzenleme açılır; yoksa rezervasyon açılır. */
  onEdit?: (room: APIRoom) => void;
  onBook: (room: APIRoom) => void;
  onRefresh: () => Promise<void>;
  canManage: boolean;
  day?: string;
  onOpenBooking?: (booking: Booking) => void;
}) {
  const floor = snapshot.floors.find((f) => f.floor_id === floorId)!;
  const rooms = snapshot.rooms.filter((r) => r.floor_id === floorId && (onEdit || r.rentable !== false));
  const [editing, setEditing] = useState(false);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    position: Position;
    scale: number;
  } | null>(null);
  useEffect(() => {
    setPositions(Object.fromEntries(rooms.map((r) => [r.room_id, r.position])));
    setEditing(false);
  }, [snapshot, floorId]);
  return (
    <div className="space-y-4">
      <ErrorMessage message={error} />
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">
          {localized(floor.label) || floor.code} · {rooms.length} birim ·{" "}
          {floor.width} × {floor.height}
        </p>
        {canManage && (
          <div className="flex gap-2">
            <button
              className={`uni-control ${secondaryStyle}`}
              onClick={() => {
                setEditing(!editing);
                setPositions(
                  Object.fromEntries(rooms.map((r) => [r.room_id, r.position])),
                );
              }}
            >
              {editing ? "Vazgeç" : "Planı Düzenle"}
            </button>
            {editing && (
              <button
                disabled={busy}
                className={`uni-control ${buttonStyle}`}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await command("floor.plan.save", {
                      floor_id: floorId,
                      placements: Object.entries(positions).map(
                        ([room_id, position]) => ({ room_id, position }),
                      ),
                    });
                    await onRefresh();
                    setEditing(false);
                  } catch (e) {
                    setError(messageOf(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Planı Kaydet
              </button>
            )}
          </div>
        )}
      </div>
      {editing && (
        <p className="text-xs text-brand-blue-700">
          Birimleri sürükleyerek yerleştirin. Boyutları ve kat atamasını birim
          düzenleme ekranından değiştirebilirsiniz.
        </p>
      )}
      <div className="uni-card overflow-auto rounded-2xl border border-slate-200 bg-white p-4">
        <div
          ref={canvas}
          className="relative min-w-[800px] w-full bg-slate-50"
          style={{
            aspectRatio: `${floor.width}/${floor.height}`,
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          onPointerMove={(e) => {
            if (!drag.current || !editing) return;
            const d = drag.current;
            setPositions((p) => ({
              ...p,
              [d.id]: {
                ...d.position,
                x: Math.round(
                  Math.max(
                    0,
                    Math.min(
                      floor.width - d.position.width,
                      d.position.x + (e.clientX - d.x) / d.scale,
                    ),
                  ),
                ),
                y: Math.round(
                  Math.max(
                    0,
                    Math.min(
                      floor.height - d.position.height,
                      d.position.y + (e.clientY - d.y) / d.scale,
                    ),
                  ),
                ),
              },
            }));
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          {rooms.map((room) => {
            const p = positions[room.room_id] || room.position;
            const state = roomBoardState(snapshot.rooms, snapshot.bookings, room, snapshot.server_time, day);
            const occupied = state.bookings;
            return (
              <button
                type="button"
                key={room.room_id}
                title={`${room.code} · ${state.label}${occupied.length ? ` · ${occupied.map(b => b.guest_name).join(", ")}` : ""}`}
                className={`uni-control absolute rounded-lg border shadow-sm overflow-hidden flex flex-col items-center justify-center px-1 ${editing ? "cursor-move touch-none" : "cursor-pointer"}`}
                style={{
                  ...statusStyle(boardStatusKey(state)),
                  left: `${(p.x / floor.width) * 100}%`,
                  top: `${(p.y / floor.height) * 100}%`,
                  width: `${(p.width / floor.width) * 100}%`,
                  height: `${(p.height / floor.height) * 100}%`,
                  minHeight: 24,
                }}
                onPointerDown={(e) => {
                  if (!editing) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = {
                    id: room.room_id,
                    x: e.clientX,
                    y: e.clientY,
                    position: p,
                    scale:
                      canvas.current!.getBoundingClientRect().width /
                      floor.width,
                  };
                }}
                onClick={() => {
                  if (!editing) {
                    if (occupied[0] && onOpenBooking) onOpenBooking(occupied[0]);
                    // Birim düzenleme yalnızca Tanımlar ekranından yapılır;
                    // panoda boş birim rezervasyon açar.
                    else if (onEdit && canManage) onEdit(room);
                    else onBook(room);
                  }
                }}
              >
                <strong className="text-[10px] font-mono leading-none shrink-0">
                  {room.code}
                </strong>
                <span className="text-[8px] leading-none mt-1 truncate max-w-full shrink-0">
                  {state.label}{occupied[0] ? ` · ${occupied[0].guest_name}` : ""}
                </span>
                {[RoomState.Dirty,RoomState.OutOfOrder,RoomState.Maintenance].some(status=>status===state.operationalStatus) && <span className="absolute right-1 top-1 h-2 w-2 rounded-full" style={{backgroundColor:STATUS_PALETTE[roomStatusKey(state.operationalStatus)].accent}} aria-label={STATUS_PALETTE[roomStatusKey(state.operationalStatus)].label} title={STATUS_PALETTE[roomStatusKey(state.operationalStatus)].label}/>}
              </button>
            );
          })}
        </div>
      </div>
      {!rooms.length && (
        <p className="text-center text-sm text-slate-400 py-8">
          Bu katta henüz birim yok.
        </p>
      )}
    </div>
  );
}
