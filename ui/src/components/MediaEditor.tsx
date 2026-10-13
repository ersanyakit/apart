import React, { useState } from "react";
import {
  Camera,
  Upload,
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
  const { locale } = useI18n();
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
    if (value.length + items.length > 30)
      throw new Error(contracts.errors.media_limit);
    onChange([...value, ...items]);
  };
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-uninav-book flex items-center gap-2 text-[1.125rem] leading-6 text-slate-900">
          <Camera size={16} aria-hidden="true" />
          Görsel ve Video Galerisi
        </h3>
      </div>
      {error && (
        <p
          role="alert"
          className="text-xs text-red-600 rounded-xl bg-red-50 p-3"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <label
          className={`inline-flex items-center gap-2 rounded-xl bg-brand-blue-600 px-4 py-3 text-xs font-bold text-white cursor-pointer ${busy || !hotelId ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Upload size={15} />
          {busy ? "Yükleniyor…" : "Dosya Yükle"}
          <input
            aria-label="Medya dosyalarını yükle"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
            disabled={busy || !hotelId}
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              void action(async () => {
                if (value.length + files.length > 30)
                  throw new Error(contracts.errors.media_limit);
                const items = await command<MediaAsset[]>(
                  "media.upload",
                  { hotel_id: hotelId },
                  files,
                );
                append(items);
              });
            }}
          />
        </label>
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
          <Library size={15} />
          Kütüphaneden Seç
        </button>
      </div>
      {!hotelId && (
        <p className="text-xs text-slate-400">
          Dosya yüklemek için önce oteli kaydedin.
        </p>
      )}
      <div className="flex gap-2">
        <div className="relative">
          <select
            aria-label="Medya türü"
            value={kind}
            onChange={(e) => setKind(e.target.value as "image" | "video")}
            className="appearance-none rounded-xl bg-[#f9f9f9] py-2.5 pl-3 pr-9 text-xs font-bold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <option value="image">Resim</option>
            <option value="video">Video</option>
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
          aria-label="Medya URL"
          value={url}
          onChange={(e) => setURL(e.target.value)}
          placeholder="https://…"
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
          aria-label="Medya bağlantısı ekle"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {value.map((asset, index) => (
            <article
              key={asset.media_id || `${index}-${asset.url}`}
              className="overflow-hidden rounded-[20px] bg-[#f9f9f9]"
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
              <LocalizedTextFields
                compact
                label="Başlık"
                values={asset.title || {}}
                onChange={(title) => update(index, { title })}
                placeholder="Medya başlığı"
              />
              <LocalizedTextFields
                compact
                label="Açıklama"
                values={asset.description || {}}
                onChange={(description) => update(index, { description })}
                multiline
                placeholder="Medya açıklaması"
              />
              <LocalizedTextFields
                compact
                label="Alternatif metin"
                values={asset.alt_text || {}}
                onChange={(alt_text) => update(index, { alt_text })}
                placeholder="Erişilebilirlik metni"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label="Medyayı sola taşı"
                  className="uni-control p-2 text-slate-400 disabled:opacity-30"
                  onClick={() => {
                    const items = [...value];
                    [items[index - 1], items[index]] = [
                      items[index],
                      items[index - 1],
                    ];
                    onChange(items);
                  }}
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  type="button"
                  disabled={index === value.length - 1}
                  aria-label="Medyayı sağa taşı"
                  className="uni-control p-2 text-slate-400 disabled:opacity-30"
                  onClick={() => {
                    const items = [...value];
                    [items[index + 1], items[index]] = [
                      items[index],
                      items[index + 1],
                    ];
                    onChange(items);
                  }}
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Medyayı galeriden çıkar"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="uni-control p-2 text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {value.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
          Henüz medya eklenmedi. Birden fazla resim veya video ekleyebilirsiniz.
        </div>
      )}
      {library && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 grid place-items-center p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Medya kütüphanesi"
            className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
          >
            <div className="flex justify-between mb-4">
              <h3 className="font-black">MEDYA KÜTÜPHANESİ</h3>
              <button className="uni-control"
                type="button"
                aria-label="Kütüphaneyi kapat"
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
              <p className="text-slate-400 text-sm">Kütüphane henüz boş.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
