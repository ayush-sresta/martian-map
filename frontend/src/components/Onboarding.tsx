"use client";
import { useEffect, useState } from "react";

const WORD = "placeholder";

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (count < WORD.length) {
      const t = setTimeout(() => setCount(c => c + 1), 120);
      return () => clearTimeout(t);
    } else {
      const fade = setTimeout(() => setOut(true), 800);
      const done = setTimeout(onDone, 1800);
      return () => { clearTimeout(fade); clearTimeout(done); };
    }
  }, [count, onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#0a0a0a",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: out ? 0 : 1,
      transition: "opacity 1s ease",
    }}>
      <style>{`
        @font-face {
          font-family: "MainFont";
          src: url("/main.ttf") format("truetype");
        }
      `}</style>
      <h1 style={{
        color: "#fff",
        fontSize: "3rem",
        letterSpacing: "0.25em",
        margin: 0,
        fontFamily: "MainFont, Arial, sans-serif",
      }}>
        {WORD.slice(0, count)}
      </h1>
    </div>
  );
}
