import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  GripVertical,
  Plus,
  Trash2,
  Library,
  Video,
  X,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import {
  command,
  contracts,
  localized,
  messageOf,
  type MediaAsset,
} from "../lib/api";

import { MediaUpload } from "./MediaUpload";
import { useI18n } from "./I18n";
import { LocalizedTextFields } from "./fields";

type Props = {
  value: MediaAsset[];
  onChange: (items: MediaAsset[]) => void;
  hotelId?: string;
  languages?: string[];
  onBusy?: (busy: boolean) => void;
};
export function MediaEditor({
  value,
  onChange,
  hotelId,
  onBusy,
}: Props) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const { locale } = useI18n();
  const latest = useRef({ value, onChange });
  useEffect(() => { latest.current = { value, onChange }; }, [value, onChange]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const commit = (items: MediaAsset[]) => onChange(items.map((item, sort_order) => ({ ...item, sort_order })));
  const move = (from: number, to: number) => {
    if (from === to || busy) return;
    const items = [...value];
    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    commit(items);
    setAnnouncement(`Medya ${from + 1}, ${to + 1}. sıraya taşındı.`);
  };
  const [url, setURL] = useState("");
  const [kind, setKind] = useState<"image" | "video">("image");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [library, setLibrary] = useState<MediaAsset[] | null>(null);
  const update = (index: number, patch: Partial<MediaAsset>) =>
    onChange(
      value.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const action = async (task: () => Promise<void>) => {
    setBusy(true);
    onBusy?.(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };
  const append = (items: MediaAsset[]) => {
    if (latest.current.value.length + items.length > 30)
      throw new Error(contracts.errors.media_limit);
    latest.current.onChange([...latest.current.value, ...items].map((item, sort_order) => ({ ...item, sort_order })));
  };
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-uninav-book flex items-center gap-2 text-[1.125rem] leading-6 text-slate-900">
          <Camera size={16} aria-hidden="true" />{_uiText("Görsel ve Video Galerisi")} </h3>
      </div>
      {error && (
        <p
          role="alert"
          className="text-xs text-red-600 rounded-xl bg-red-50 p-3"
        >
          {error}
        </p>
      )}
      <MediaUpload count={value.length} disabled={busy || !hotelId} onUpload={async files => {
        setBusy(true); onBusy?.(true); setError("");
        try { append(await command<MediaAsset[]>("media.upload", { hotel_id: hotelId }, files)); }
        finally { setBusy(false); onBusy?.(false); }
      }}/>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !hotelId}
          onClick={() =>
            void action(async () =>
              setLibrary(
                await command<MediaAsset[]>("media.list", {
                  hotel_id: hotelId,
                }),
              ),
            )
          }
          className="uni-control rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <Library size={15} />{_uiText("Kütüphaneden Seç")} </button>
      </div>
      {!hotelId && (
        <p className="text-xs text-slate-400">{_uiText("Dosya yüklemek için önce oteli kaydedin.")} </p>
      )}
      <details><summary className="min-h-11 cursor-pointer text-sm text-slate-500">{_uiText("Bağlantı ile ekle")}</summary>
      <div className="flex gap-2">
        <div className="relative">
          <select
            aria-label={_uiText("Medya türü")}
            value={kind}
            onChange={(e) => setKind(e.target.value as "image" | "video")}
            className="appearance-none rounded-xl bg-[#f9f9f9] py-2.5 pl-3 pr-9 text-xs font-bold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <option value="image">{_uiText("Resim")}</option>
            <option value="video">{_uiText("Video")}</option>
          </select>
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          >
            <path
              d="M4 6l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <input
          aria-label={_uiText("Medya URL")}
          value={url}
          onChange={(e) => setURL(e.target.value)}
          placeholder={_uiText("https://…")}
          className="min-w-0 flex-1 rounded-xl bg-[#f9f9f9] px-3 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-neutral-400"
        />
        <button
          type="button"
          disabled={!url || busy}
          onClick={() => {
            try {
              append([
                {
                  url,
                  kind,
                  title: {},
                  description: {},
                  alt_text: {},
                  sort_order: value.length,
                },
              ]);
              setURL("");
              setError("");
            } catch (e) {
              setError(messageOf(e));
            }
          }}
          className="uni-control p-3 rounded-xl bg-slate-900 text-white disabled:opacity-40"
          aria-label={_uiText("Medya bağlantısı ekle")}
        >
          <Plus size={16} />
        </button>
      </div>
      </details>
      <p role="status" className="sr-only">{announcement}</p>
      {!!value.length && <p className="text-xs text-slate-500">{_uiText("Sıralamak için kartın taşıma tutamacını sürükleyin veya ok düğmelerini kullanın.")}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {value.map((asset, index) => (
            <article
              key={asset.media_id || `${index}-${asset.url}`}
              className={`overflow-hidden rounded-[20px] bg-[#f9f9f9] ${dropIndex === index ? "ring-2 ring-sky-400" : ""} ${dragIndex === index ? "opacity-50" : ""}`}
              onDragOver={e => { if (dragIndex !== null && !busy) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropIndex(index); } }}
              onDrop={e => { if (dragIndex !== null) { e.preventDefault(); move(dragIndex, index); setDragIndex(null); setDropIndex(null); } }}
            >
            <div className="aspect-video bg-slate-100 relative">
              {asset.kind === "video" ? (
                <video
                  src={asset.url}
                  controls
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={asset.url}
                  alt={localized(asset.alt_text, locale)}
                  className="w-full h-full object-cover"
                />
              )}
              <span className="absolute top-2 left-2 rounded-md bg-white/90 px-2 py-1 text-[9px] font-black flex items-center gap-1">
                {asset.kind === "video" ? (
                  <Video size={11} />
                ) : (
                  <Camera size={11} />
                )}{" "}
                {index + 1}
              </span>
            </div>
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <button type="button" draggable={!busy} disabled={busy} aria-label={_uiText("{value1}. medyayı sürükleyerek sırala", {value1: String(index + 1)})}
                  title={_uiText("Sürükleyerek sırala; klavyede Alt + ok tuşlarını kullanın")}
                  className="uni-control nav-icon-button min-h-11 min-w-11 cursor-grab rounded-xl text-slate-500"
                  onKeyDown={e => { if(e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); move(index, Math.max(0, Math.min(value.length-1,index+(e.key === "ArrowLeft" ? -1 : 1)))); } }}
                  onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(index)); setDragIndex(index); }}
                  onDragEnd={() => { setDragIndex(null); setDropIndex(null); }}><GripVertical size={18}/></button>
                <span className="min-w-0 truncate text-xs text-slate-500">{asset.original_name || _uiText("{value1} {value2}", {value1: String(asset.kind === "image" ? "Görsel" : "Video"), value2: String(index + 1)})}</span>
              </div>
              <details><summary className="min-h-11 cursor-pointer text-sm text-slate-600">{_uiText("Başlık ve açıklama")}</summary>
              <fieldset disabled={busy} className="space-y-3">
              <LocalizedTextFields
                compact
                label={_uiText("Başlık")}
                values={asset.title || {}}
                onChange={(title) => update(index, { title })}
                placeholder={_uiText("Medya başlığı")}
              />
              <LocalizedTextFields
                compact
                label={_uiText("Açıklama")}
                values={asset.description || {}}
                onChange={(description) => update(index, { description })}
                multiline
                placeholder={_uiText("Medya açıklaması")}
              />
              <LocalizedTextFields
                compact
                label={_uiText("Alternatif metin")}
                values={asset.alt_text || {}}
                onChange={(alt_text) => update(index, { alt_text })}
                placeholder={_uiText("Erişilebilirlik metni")}
              />
              </fieldset></details>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  aria-label={_uiText("Medyayı sola taşı")}
                  className="uni-control nav-icon-button min-h-11 min-w-11 rounded-xl text-slate-400 disabled:opacity-30"
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  type="button"
                  disabled={busy || index === value.length - 1}
                  aria-label={_uiText("Medyayı sağa taşı")}
                  className="uni-control nav-icon-button min-h-11 min-w-11 rounded-xl text-slate-400 disabled:opacity-30"
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  aria-label={_uiText("Medyayı galeriden çıkar")}
                  disabled={busy}
                  onClick={() => commit(value.filter((_, i) => i !== index))}
                  className="uni-control nav-icon-button min-h-11 min-w-11 rounded-xl text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {library && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 grid place-items-center p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={_uiText("Medya kütüphanesi")}
            className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
          >
            <div className="flex justify-between mb-4">
              <h3 className="font-black">{_uiText("MEDYA KÜTÜPHANESİ")}</h3>
              <button className="uni-control nav-icon-button min-h-11 min-w-11 rounded-full"
                type="button"
                aria-label={_uiText("Kütüphaneyi kapat")}
                onClick={() => setLibrary(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {library.map((a) => (
                <button
                  type="button"
                  key={a.media_id}
                  disabled={value.some((v) => v.media_id === a.media_id)}
                  onClick={() => {
                    try {
                      append([a]);
                      setLibrary(null);
                    } catch (e) {
                      setError(messageOf(e));
                    }
                  }}
                  className="uni-control rounded-xl border border-slate-200 overflow-hidden disabled:opacity-30"
                >
                  {a.kind === "video" ? (
                    <video src={a.url} className="aspect-video object-cover" />
                  ) : (
                    <img
                      src={a.url}
                      alt={localized(a.alt_text)}
                      className="w-full aspect-video object-cover"
                    />
                  )}
                  <p className="p-2 truncate text-xs">
                    {localized(a.title) || a.original_name || a.kind}
                  </p>
                </button>
              ))}
            </div>
            {library.length === 0 && (
              <p className="text-slate-400 text-sm">{_uiText("Kütüphane henüz boş.")}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
