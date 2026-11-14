"use client"
import dynamic from "next/dynamic";

const MarsGlobe = dynamic(
  () => import("@/components/MarsGlobe"),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        Initializing Mars Explorer...
      </div>
    ),
  }
);

export default function Home() {
  return <MarsGlobe />;
}
