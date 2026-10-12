import React, { useState, useEffect, useRef } from "react";
import {
  command,
  messageOf,
  localized,
  unitKinds,
  occupancy,
  type APIRoom,
  type Snapshot,
  type Position,
} from "../lib/api";
import { buttonStyle, secondaryStyle, ErrorMessage } from "./FormKit";
export function FloorBoard({
  snapshot,
  floorId,
  at,
  onEdit,
  onBook,
  onRefresh,
  canManage,
}: {
  snapshot: Snapshot;
  floorId: string;
  at: string;
  onEdit: (room: APIRoom) => void;
  onBook: (room: APIRoom) => void;
  onRefresh: () => Promise<void>;
  canManage: boolean;
}) {
  const floor = snapshot.floors.find((f) => f.floor_id === floorId)!;
  const rooms = snapshot.rooms.filter((r) => r.floor_id === floorId);
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
              className={secondaryStyle}
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
                className={buttonStyle}
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
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white p-4">
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
            const occupied = occupancy(
              snapshot.rooms,
              snapshot.bookings,
              room,
              at,
            );
            const color = occupied.some((b) => b.status === "checked_in")
              ? "bg-red-50 border-red-200 text-red-800"
              : occupied.length
                ? "bg-brand-blue-50 border-brand-blue-200 text-brand-blue-900"
                : ["Arizali", "Tadilat"].includes(room.status)
                  ? "bg-slate-200 border-slate-400 text-slate-700"
                  : room.status === "Kirli"
                    ? "bg-orange-50 border-orange-200 text-orange-800"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900";
            return (
              <button
                type="button"
                key={room.room_id}
                title={`${room.code} · ${unitKinds[room.kind]}`}
                className={`absolute rounded-lg border shadow-sm overflow-hidden flex flex-col items-center justify-center px-1 ${color} ${editing ? "cursor-move touch-none" : "cursor-pointer"}`}
                style={{
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
                  if (!editing) (canManage ? onEdit : onBook)(room);
                }}
              >
                <strong className="text-[10px] font-mono leading-none shrink-0">
                  {room.code}
                </strong>
                <span className="text-[8px] leading-none mt-1 truncate max-w-full shrink-0">
                  {unitKinds[room.kind]}
                  {room.bed_group ? ` · ${room.bed_level}. seviye` : ""}
                </span>
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
