"use client";
import type { CSSProperties } from "react";
import { setMuted, useMuted } from "./sound";
import { SpeakerIcon } from "./CrayonIcon";

// Speaker toggle for all site sounds.
export default function MuteButton({ style }: { style?: CSSProperties }) {
  const muted = useMuted();

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      title={muted ? "Unmute sound" : "Mute sound"}
      className="crayon"
      style={{
        width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 6, border: "3px solid #1c1c3a",
        background: "#f4ead5", color: "#1c1c3a",
        ...style,
      }}
    >
      <SpeakerIcon muted={muted} />
    </button>
  );
}
