"use client";
import type { CSSProperties } from "react";
import { setMuted, useMuted } from "./sound";

// Speaker toggle for all site sounds.
export default function MuteButton({ style }: { style?: CSSProperties }) {
  const muted = useMuted();

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      title={muted ? "Unmute sound" : "Mute sound"}
      style={{
        width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(21,26,42,0.9)", color: "white",
        ...style,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
        {muted ? (
          <>
            <line x1="16" y1="9" x2="22" y2="15" />
            <line x1="22" y1="9" x2="16" y2="15" />
          </>
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
    </button>
  );
}
