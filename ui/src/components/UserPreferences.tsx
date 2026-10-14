"use client";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { command } from "../lib/api";
import { useNotifications } from "./Toast";

export type Preferences = Record<string, string | number | boolean>;
type SaveState = "idle" | "saving" | "saved" | "error";
type Context = { preferences: Preferences; update: (patch: Preferences) => void; saveState: SaveState; flush: () => Promise<boolean> };
const PreferencesContext = createContext<Context | null>(null);

/** Remount with user_id as key. Initial values come from authenticated SSR;
 * shared browser storage is never imported into another person's account. */
export function UserPreferencesProvider({ userId, initial = {}, children }: {
  userId?: string; initial?: Preferences; children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pending = useRef<Preferences>({});
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const running = useRef<Promise<boolean> | null>(null);
  const notify = useNotifications();
  const flush = useCallback((): Promise<boolean> => {
    if (running.current) return running.current;
    if (!userId || !active.current || !Object.keys(pending.current).length) return Promise.resolve(true);
    setSaveState("saving");
    running.current = (async () => {
      while (active.current && Object.keys(pending.current).length) {
        const patch = pending.current;
        pending.current = {};
        controller.current = new AbortController();
        const requestController = controller.current;
        const timeout = window.setTimeout(() => requestController.abort(), 15000);
        try {
          await command<Preferences>("user.preferences.update", { preferences: patch }, undefined, controller.current.signal);
        } catch {
          if (!active.current) return false;
          pending.current = { ...patch, ...pending.current };
          setSaveState("error");
          notify("Tercihler kaydedilemedi. Ayarlar ekranından yeniden deneyebilirsiniz.", "error");
          return false;
        } finally {
          window.clearTimeout(timeout);
        }
      }
      if (active.current) setSaveState("saved");
      return true;
    })().finally(() => { running.current = null; });
    return running.current;
  }, [userId, notify]);

  useEffect(() => {
    active.current = true;
    const retry = () => { void flush(); };
    window.addEventListener("online", retry);
    return () => { active.current = false; controller.current?.abort(); window.removeEventListener("online", retry); };
  }, [flush]);

  const update = useCallback((patch: Preferences) => {
    setPreferences(previous => ({ ...previous, ...patch }));
    if (userId) { pending.current = { ...pending.current, ...patch }; void flush(); }
  }, [flush, userId]);
  return <PreferencesContext.Provider value={{ preferences, update, saveState, flush }}>{children}</PreferencesContext.Provider>;
}

export const useUserPreferences = () => useContext(PreferencesContext);

/** Standalone components remain usable without an authenticated provider. */
export function usePreference<T extends string | number | boolean>(key: string, fallback: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const context = useUserPreferences();
  const [local, setLocal] = useState(fallback);
  const value = context ? (context.preferences[key] as T | undefined) ?? fallback : local;
  const setValue = useCallback<React.Dispatch<React.SetStateAction<T>>>(next => {
    if (!context) { setLocal(next); return; }
    context.update({ [key]: typeof next === "function" ? next(value) : next });
  }, [context, key, value]);
  return [value, setValue];
}
