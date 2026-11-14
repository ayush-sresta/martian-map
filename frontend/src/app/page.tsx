"use client";

import dynamic from "next/dynamic";

const MarsGlobe = dynamic(() => import("@/components/MarsGlobe"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#080b16] text-white">
      Loading Mars explorer...
    </div>
  ),
});

export default function Home() {
  return <MarsGlobe />;
}
