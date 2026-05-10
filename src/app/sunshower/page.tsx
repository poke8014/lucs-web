import type { Metadata } from "next";
import Scene from "./Scene";

export const metadata: Metadata = {
  title: "sunshower",
  description:
    "A native California pollinator garden, in progress. Right plant, right place.",
};

export default function SunshowerPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#f7e9c9] text-[#2a1d10]">
      <Scene />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 sm:p-10">
        <header className="flex items-start justify-between text-xs uppercase tracking-[0.18em] text-[#2a1d10]/70">
          <span>sunshower</span>
          <span className="hidden sm:inline">santa clara county · zone 9b</span>
        </header>

        <div className="max-w-xl">
          <h1 className="font-serif text-5xl leading-[0.95] tracking-tight sm:text-7xl">
            a garden,
            <br />
            in progress.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#2a1d10]/80 sm:text-base">
            Native California plants, the pollinators that co-evolved with
            them, and the slow work of pulling weeds before the rains come.
          </p>
        </div>
      </div>
    </main>
  );
}
