"use client";

import dynamic from "next/dynamic";
import type { MapReport } from "./types";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[min(70vh,560px)] min-h-[320px] w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
      aria-hidden
    />
  ),
});

export default function MapViewLoader({ reports }: { reports: MapReport[] }) {
  return <MapView reports={reports} />;
}
