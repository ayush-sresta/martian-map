"use client";
import { useEffect, useState } from "react";

const MIN_DURATION_MS = 7000;
const TICK_MS = 100;

// Loading screen: the sprite travels across a track toward Mars.
// Real tile-loading progress isn't exposed, so progress fills over at least
// MIN_DURATION_MS, holds at 95% until Mars is ready, then finishes the trip.
export default function MarsLoader({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const step = (100 * TICK_MS) / MIN_DURATION_MS;
    const t = setInterval(() => {
      setProgress((p) => Math.min(ready ? 100 : 95, p + step));
    }, TICK_MS);
    return () => clearInterval(t);
  }, [ready]);

  useEffect(() => {
    if (progress < 100) return;
    const t = setTimeout(onFinish, 400);
    return () => clearTimeout(t);
  }, [progress, onFinish]);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#080b16]"
      style={{ fontFamily: "MainFont, sans-serif" }}
    >
      <style>{`
        @keyframes loaderBob { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -10px); } }
        @keyframes flameFlicker { 0%,100% { transform: scaleX(1) scaleY(1); opacity: 0.95; } 25% { transform: scaleX(1.2) scaleY(0.85); opacity: 1; } 50% { transform: scaleX(0.9) scaleY(1.1); opacity: 0.85; } 75% { transform: scaleX(1.3) scaleY(0.9); opacity: 1; } }
        @keyframes coreFlicker { 0%,100% { transform: scaleX(1); } 40% { transform: scaleX(1.35); } 70% { transform: scaleX(0.8); } }
      `}</style>

      <div className="relative h-40" style={{ width: "min(640px, 80vw)" }}>
        {/* Mars */}
        <img
          src="/images/mars.png"
          alt=""
          className="absolute right-0 h-24 w-24 object-contain"
          style={{ bottom: "-1.375rem" }}
        />

        {/* Rocket + exhaust: vertically centred on the track, facing Mars (right).
            The rocket art points up, so it is rotated 90deg; its tail is then on the left. */}
        <div
          className="absolute"
          style={{
            bottom: "-0.875rem",
            left: `calc((100% - 6rem) * ${progress / 100})`,
            width: "1.5rem",
            height: "5rem",
            animation: "loaderBob 0.6s ease-in-out infinite",
          }}
        >
          {/* Outer flame */}
          <div
            className="absolute"
            style={{
              left: "-3.25rem",
              top: "50%",
              width: "2.25rem",
              height: "1rem",
              marginTop: "-0.5rem",
              transformOrigin: "100% 50%",
              background:
                "linear-gradient(to left, #fff1a8 0%, #ffb020 30%, #ff5a1f 65%, rgba(255,60,0,0) 100%)",
              clipPath: "polygon(100% 15%, 0% 50%, 100% 85%)",
              filter: "blur(1px)",
              animation: "flameFlicker 0.18s linear infinite",
            }}
          />
          {/* Hot core */}
          <div
            className="absolute"
            style={{
              left: "-2.25rem",
              top: "50%",
              width: "1.25rem",
              height: "0.4rem",
              marginTop: "-0.2rem",
              transformOrigin: "100% 50%",
              background: "linear-gradient(to left, #ffffff, #fff7c2 60%, rgba(255,247,194,0) 100%)",
              clipPath: "polygon(100% 0%, 0% 50%, 100% 100%)",
              animation: "coreFlicker 0.12s linear infinite",
            }}
          />
          <img
            src="/images/rocket.png"
            alt=""
            className="absolute h-20 w-auto"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%) rotate(90deg)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
