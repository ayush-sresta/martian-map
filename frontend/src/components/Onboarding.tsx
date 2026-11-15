"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const SLIDE_DURATION = 1800;
const BLACK_DURATION = 600;
const WORD = "marstronaut";
const TYPE_SPEED = 30;

const DIALOGUE: { gif: string }[] = [
  { gif: "/dialogues/1.gif"  },
  { gif: "/dialogues/2.gif"  },
  { gif: "/dialogues/3.gif"  },
  { gif: "/dialogues/4.gif"  },
  { gif: "/dialogues/5.gif"  },
  { gif: "/dialogues/6.gif"  },
];

const DIALOGUE2: { gif: string }[] = [
  { gif: "/dialogues/7.gif"  },
  { gif: "/dialogues/8.gif"  },
  { gif: "/dialogues/9.gif"  },
  { gif: "/dialogues/10.gif" },
];

type Phase = "title" | "black0" | "slide1" | "dialogue" | "black1" | "slide2" | "black2" | "dialogue2" | "black3" | "slide3" | "black4" | "slide4" | "fadeout";

const NEXT: Record<Phase, Phase> = {
  title:     "black0",
  black0:    "slide1",
  slide1:    "dialogue",
  dialogue:  "black1",
  black1:    "slide2",
  slide2:    "black2",
  black2:    "dialogue2",
  dialogue2: "black3",
  black3:    "slide3",
  slide3:    "black4",
  black4:    "slide4",
  slide4:    "fadeout",
  fadeout:   "fadeout",
};

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("title");
  const [letters, setLetters] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentDialogue = phase === "dialogue2" ? DIALOGUE2 : DIALOGUE;

  const advance = useCallback(() => {
    if (phase !== "dialogue" && phase !== "dialogue2") return;
    if (lineIndex < currentDialogue.length - 1) {
      setLineIndex(i => i + 1);
    } else {
      setLineIndex(0);
      setPhase(NEXT[phase]);
    }
  }, [phase, lineIndex, currentDialogue.length]);

  // reset lineIndex when entering a dialogue phase
  useEffect(() => {
    if (phase === "dialogue" || phase === "dialogue2") setLineIndex(0);
  }, [phase]);

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") advance();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance]);

  // title typewriter
  useEffect(() => {
    if (phase !== "title") return;
    if (letters < WORD.length) {
      const t = setTimeout(() => setLetters(l => l + 1), 200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("black0"), 800);
    return () => clearTimeout(t);
  }, [phase, letters]);

  // auto-advance timed phases
  useEffect(() => {
    if (phase === "dialogue" || phase === "dialogue2" || phase === "title" || phase === "fadeout") return;
    const dur = phase.startsWith("black") ? BLACK_DURATION : SLIDE_DURATION;
    const t = setTimeout(() => {
      const next = NEXT[phase];
      if (next === "fadeout") { setFadeOut(true); setTimeout(onDone, 1000); }
      else setPhase(next);
    }, dur);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  const slideFor: Record<string, string> = {
    slide1: "/images/1.png",
    slide2: "/images/2.png",
    slide3: "/images/3.png",
    slide4: "/images/4.png",
  };

  const isDialogue = phase === "dialogue" || phase === "dialogue2";
  const bgImage = phase === "dialogue2" ? "/images/2.png" : "/images/1.png";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000",
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? "opacity 1s ease" : "none",
    }}>
      <style>{`
        @font-face { font-family: "MainFont"; src: url("/main.ttf") format("truetype"); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Title */}
      {phase === "title" && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('/images/background.png')",
          backgroundSize: "cover", backgroundPosition: "center",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <h1 style={{
            color: "#fff", fontSize: "3rem", letterSpacing: "0.25em", margin: 0,
            fontFamily: "MainFont, Arial, sans-serif",
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}>
            {WORD.slice(0, letters)}
          </h1>
        </div>
      )}

      {/* Slides */}
      {slideFor[phase] && (
        <img key={phase} src={slideFor[phase]} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "fadeIn 0.5s ease" }}
        />
      )}

      {/* Dialogue phases */}
      {isDialogue && (
        <div style={{ position: "absolute", inset: 0 }}>
          <img src={bgImage} alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div onClick={advance} style={{
            position: "absolute", top: "50%", left: 0, right: 0,
            display: "flex", justifyContent: "center",
            cursor: "pointer", zIndex: 2,
          }}>
            <img key={`${phase}-${lineIndex}`} src={currentDialogue[lineIndex].gif} alt=""
              style={{ width: "55%", height: "auto", objectFit: "contain", transform: "translateY(-50%)" }}
            />
          </div>
          <img src="/images/sprite.png" alt="sprite"
            style={{
              position: "absolute", bottom: 0, right: "5%",
              height: "55%", width: "auto", objectFit: "contain",
              zIndex: 3, pointerEvents: "none",
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
            }}
          />
        </div>
      )}
    </div>
  );
}
