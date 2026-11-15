"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import Onboarding from "@/components/Onboarding";

const MarsGlobe = dynamic(() => import("@/components/MarsGlobe"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#080b16] text-white">
      Loading Mars explorer...
    </div>
  ),
});

export default function Home() {
  const [done, setDone] = useState(false);
  return (
    <>
      {!done && <Onboarding onDone={() => setDone(true)} />}
      {done && <MarsGlobe />}
    </>
  );
}
