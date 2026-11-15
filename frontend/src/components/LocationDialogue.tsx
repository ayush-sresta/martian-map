"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const TYPE_SPEED_MS = 28;

// Ren'Py-style text dialogue: name tag, typewriter text, click/Space to advance.
export default function LocationDialogue({
  title,
  lines,
  onDone,
}: {
  title: string;
  lines: string[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const line = lines[index] ?? "";
  const typing = shown < line.length;

  // Typewriter
  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setShown((n) => n + 1), TYPE_SPEED_MS);
    return () => clearTimeout(t);
  }, [typing, shown]);

  // Voice blip per line
  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio("/audio/astronaut.mp3");
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    return () => audio.pause();
  }, [index]);

  const advance = useCallback(() => {
    if (typing) {
      setShown(line.length);
    } else if (index < lines.length - 1) {
      setIndex((i) => i + 1);
      setShown(0);
    } else {
      onDone();
    }
  }, [typing, line.length, index, lines.length, onDone]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 35, pointerEvents: "none", fontFamily: "MainFont, sans-serif" }}>
      <style>{`@keyframes dlgBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }`}</style>

      {/* Text box */}
      <div
        onClick={advance}
        style={{
          position: "absolute", left: "50%", bottom: "5%", transform: "translateX(-50%)",
          width: "min(720px, 60%)", minHeight: 130,
          background: "rgba(10, 10, 14, 0.85)", border: "2px solid rgba(255,255,255,0.85)",
          borderRadius: 10, padding: "26px 28px 22px", color: "white",
          pointerEvents: "auto", cursor: "pointer",
        }}
      >
        {/* Name tag */}
        <div
          style={{
            position: "absolute", top: -16, left: 20,
            background: "white", color: "black", padding: "3px 12px",
            borderRadius: 6, fontSize: "0.85rem",
          }}
        >
          {title}
        </div>

        <p style={{ margin: 0, fontSize: "1.05rem", lineHeight: 1.5 }}>{line.slice(0, shown)}</p>

        <div style={{ position: "absolute", right: 14, bottom: 8, fontSize: "0.7rem", opacity: 0.6 }}>
          {index + 1}/{lines.length}{" "}
          {!typing && <span style={{ animation: "dlgBlink 1s infinite" }}>▼</span>}
        </div>
      </div>

      {/* Sprite */}
      <img
        src="/images/sprite.png"
        alt="sprite"
        style={{
          position: "absolute", bottom: 0, right: "3%",
          height: "45%", width: "auto", objectFit: "contain",
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
        }}
      />
    </div>
  );
}
