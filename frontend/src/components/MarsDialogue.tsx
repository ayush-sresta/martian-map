"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const INTRO_GIFS = [
  "/dialogues/mars/1.gif",
  "/dialogues/mars/2.gif",
  "/dialogues/mars/3.gif",
  "/dialogues/mars/4.gif",
  "/dialogues/mars/5.gif",
];

// Ren'Py-style dialogue shown over the globe once Mars has loaded.
// Same look as the onboarding dialogue: gif box near the bottom, sprite bottom-right.
export default function MarsDialogue({
  gifs = INTRO_GIFS,
  onDone,
}: {
  gifs?: string[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice blip on every gif
  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio("/audio/astronaut.mp3");
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    return () => audio.pause();
  }, [index]);

  const advance = useCallback(() => {
    if (index < gifs.length - 1) setIndex((i) => i + 1);
    else onDone();
  }, [index, gifs.length, onDone]);

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
    <div style={{ position: "absolute", inset: 0, zIndex: 35, pointerEvents: "none" }}>
      <div
        onClick={advance}
        style={{
          position: "absolute", bottom: "6%", left: 0, right: 0,
          display: "flex", justifyContent: "center",
        }}
      >
        <img
          key={index}
          src={gifs[index]}
          alt=""
          style={{ width: "50%", height: "auto", objectFit: "contain", pointerEvents: "auto", cursor: "pointer" }}
        />
      </div>
      <img
        src="/images/sprite.png"
        alt="sprite"
        style={{
          position: "absolute", bottom: 0, right: "5%",
          height: "55%", width: "auto", objectFit: "contain",
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
        }}
      />
    </div>
  );
}
