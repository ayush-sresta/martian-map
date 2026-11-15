"use client";
import { useSyncExternalStore } from "react";

// Site-wide mute switch, remembered in localStorage.
// Create every sound with createSound() so muting also silences sounds already playing.

const STORAGE_KEY = "marstronaut-muted";

let muted = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
const sounds = new Set<HTMLAudioElement>();
const listeners = new Set<() => void>();

export function createSound(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.muted = muted;
  sounds.add(audio);
  return audio;
}

export function setMuted(value: boolean) {
  muted = value;
  localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  sounds.forEach((a) => (a.muted = value));
  listeners.forEach((l) => l());
}

export function useMuted(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => muted,
    () => false,
  );
}
