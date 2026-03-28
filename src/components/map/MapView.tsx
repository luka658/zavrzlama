"use client";

import { useEffect, useRef, useState } from "react";
import type { MapReport } from "./types";

const ZAGREB: [number, number] = [45.815, 15.981];
const DEFAULT_ZOOM = 13;

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> pridonosioci';

const STATUS_LABEL: Record<MapReport["status"], string> = {
  open: "Otvoreno",
  in_progress: "U tijeku",
  resolved: "Riješeno",
  archived: "Arhivirano",
};

const URGENCY_LABEL: Record<MapReport["urgency"], string> = {
  low: "Niska",
  medium: "Srednja",
  high: "Visoka",
  critical: "Kritična",
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function popupHtml(r: MapReport) {
  const desc = r.description
    ? `<p style="margin:6px 0 0;font-size:13px;color:#52525b;line-height:1.4">${escapeHtml(r.description)}</p>`
    : "";
  return `
    <div style="min-width:200px;max-width:280px;font-family:system-ui,sans-serif;color:#18181b">
      <p style="margin:0;font-weight:600;line-height:1.35">${escapeHtml(r.title)}</p>
      ${desc}
      <dl style="margin:10px 0 0;font-size:12px;color:#52525b;line-height:1.5">
        <div><dt style="display:inline;font-weight:600">Kategorija:</dt> <dd style="display:inline;margin:0">${escapeHtml(r.category_name)}</dd></div>
        <div><dt style="display:inline;font-weight:600">Status:</dt> <dd style="display:inline;margin:0">${STATUS_LABEL[r.status]}</dd></div>
        <div><dt style="display:inline;font-weight:600">Hitnost:</dt> <dd style="display:inline;margin:0">${URGENCY_LABEL[r.urgency]}</dd></div>
        <div><dt style="display:inline;font-weight:600">Težina (score):</dt> <dd style="display:inline;margin:0">${escapeHtml(String(r.score))}</dd></div>
      </dl>
    </div>
  `;
}

export default function MapView({ reports }: { reports: MapReport[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const heatRef = useRef<import("leaflet").Layer | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showHeat, setShowHeat] = useState(true);
  const [showPoints, setShowPoints] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (typeof window !== "undefined") {
        (window as unknown as { L: typeof L }).L = L;
      }
      await import("leaflet.heat/dist/leaflet-heat.js");
      if (cancelled || !containerRef.current) return;

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        scrollWheelZoom: true,
      }).setView(ZAGREB, DEFAULT_ZOOM);

      L.tileLayer(OSM_URL, {
        attribution: OSM_ATTRIB,
        maxZoom: 19,
      }).addTo(map);

      const LHeat = L as typeof L & {
        heatLayer: (
          latlngs: [number, number, number][],
          options?: {
            radius?: number;
            blur?: number;
            max?: number;
            minOpacity?: number;
            maxZoom?: number;
          },
        ) => import("leaflet").Layer;
      };

      const maxScore = Math.max(
        1,
        ...reports.map((r) => (Number.isFinite(r.score) ? r.score : 0)),
      );

      const heatPoints: [number, number, number][] = reports.map((r) => [
        r.lat,
        r.lng,
        Math.max(0.15, r.score),
      ]);

      const heatLayer = LHeat.heatLayer(heatPoints, {
        radius: 24,
        blur: 16,
        max: maxScore,
        minOpacity: 0.35,
        maxZoom: 17,
      }).addTo(map);

      const markerGroup = L.layerGroup().addTo(map);

      for (const r of reports) {
        const m = L.marker([r.lat, r.lng]);
        m.bindPopup(popupHtml(r), { maxWidth: 320 });
        markerGroup.addLayer(m);
      }

      mapRef.current = map;
      heatRef.current = heatLayer;
      markersRef.current = markerGroup;
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      heatRef.current = null;
      markersRef.current = null;
    };
  }, [reports]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const heat = heatRef.current;
    const markers = markersRef.current;
    if (heat) {
      if (showHeat) map.addLayer(heat);
      else map.removeLayer(heat);
    }
    if (markers) {
      if (showPoints) map.addLayer(markers);
      else map.removeLayer(markers);
    }
  }, [mapReady, showHeat, showPoints]);

  return (
    <div className="relative h-[min(70vh,560px)] w-full min-h-[320px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white/95 p-3 text-sm shadow-md backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-900/95">
        <p className="pointer-events-auto font-medium text-zinc-800 dark:text-zinc-100">
          Slojevi
        </p>
        <label className="pointer-events-auto flex cursor-pointer items-center gap-2 text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={showHeat}
            onChange={(e) => setShowHeat(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Toplinska karta
        </label>
        <label className="pointer-events-auto flex cursor-pointer items-center gap-2 text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={showPoints}
            onChange={(e) => setShowPoints(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Točke i popup
        </label>
      </div>

      <p className="pointer-events-none absolute bottom-2 left-3 z-[1000] max-w-[90%] text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
        Kartografski podaci: OpenStreetMap. Ne koristiti za masovno skaliranje
        (demo / hackaton).
      </p>
    </div>
  );
}
