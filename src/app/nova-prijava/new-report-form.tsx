"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, ReportUrgency } from "@/lib/types";
import { AiSuggestButton } from "./ai-suggest-button";

const ZAGREB_LAT = 45.815;
const ZAGREB_LNG = 15.9819;

const URGENCY_OPTIONS: { value: ReportUrgency; label: string }[] = [
  { value: "high", label: "Hitno" },
  { value: "medium", label: "Srednje" },
  { value: "low", label: "Nije hitno" },
];

function extFromFile(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".webp")) return "webp";
  if (n.endsWith(".gif")) return "gif";
  return "jpg";
}

function deriveTitleFromDescription(description: string): string {
  const line = description.trim().split(/\n/)[0]?.trim() ?? "";
  return line.slice(0, 200);
}

export function NewReportForm({
  categories,
  aiDescriptionEnabled = false,
}: {
  categories: Category[];
  aiDescriptionEnabled?: boolean;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [urgency, setUrgency] = useState<ReportUrgency>("medium");
  const [lat, setLat] = useState(String(ZAGREB_LAT));
  const [lng, setLng] = useState(String(ZAGREB_LNG));
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const pickFile = (f: File | null) => {
    setFile(f);
    if (f) {
      setMessage(null);
    }
  };

  const useGeolocation = () => {
    if (!navigator.geolocation) {
      setMessage({
        type: "err",
        text: "Geolokacija nije podržana u ovom pregledniku.",
      });
      return;
    }
    setGeoLoading(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(6)));
        setLng(String(pos.coords.longitude.toFixed(6)));
        setGeoLoading(false);
        setMessage({ type: "ok", text: "Lokacija s uređaja učitana." });
      },
      () => {
        setGeoLoading(false);
        setMessage({
          type: "err",
          text: "Dozvola za lokaciju odbijena ili nedostupna. Unesi koordinate ručno.",
        });
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const latN = Number.parseFloat(lat.replace(",", "."));
    const lngN = Number.parseFloat(lng.replace(",", "."));
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      setMessage({ type: "err", text: "Lat i lng moraju biti valjani brojevi." });
      return;
    }
    if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
      setMessage({ type: "err", text: "Koordinate su izvan dopuštenog raspona." });
      return;
    }
    const title = deriveTitleFromDescription(description);
    if (!title) {
      setMessage({ type: "err", text: "Unesi opis problema (barem prvi redak)." });
      return;
    }
    if (!categoryId) {
      setMessage({ type: "err", text: "Odaberi kategoriju." });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setMessage({ type: "err", text: "Moraš biti prijavljen." });
      return;
    }

    const cat = categories.find((c) => c.id === categoryId);
    const score = cat?.inherent_weight ?? 1;

    let imagePath: string | null = null;
    if (file) {
      const ext = extFromFile(file);
      const objectName = `reports/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("report-photos")
        .upload(objectName, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (upErr) {
        setLoading(false);
        setMessage({
          type: "err",
          text: `Upload slike nije uspio: ${upErr.message}`,
        });
        return;
      }
      imagePath = objectName;
    }

    const { error: insErr } = await supabase.from("reports").insert({
      user_id: user.id,
      title,
      description: description.trim() || null,
      lat: latN,
      lng: lngN,
      category_id: categoryId,
      urgency,
      image_path: imagePath,
      score,
    });

    setLoading(false);
    if (insErr) {
      setMessage({
        type: "err",
        text: insErr.message ?? "Spremanje prijave nije uspjelo.",
      });
      return;
    }
    setMessage({ type: "ok", text: "Prijava je spremljena." });
    setDescription("");
    setFile(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    setLat(String(ZAGREB_LAT));
    setLng(String(ZAGREB_LNG));
    setUrgency("medium");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {message ? (
        <p
          className={
            message.type === "ok"
              ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
          }
        >
          {message.text}
        </p>
      ) : null}

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Lokacija problema
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Zadano je središte Zagreba. Na mobitelu možeš uključiti GPS ili unijeti
          stupnjeve ručno.
        </p>
        <button
          type="button"
          onClick={useGeolocation}
          disabled={geoLoading}
          className="mt-3 rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-300 disabled:opacity-60 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
        >
          {geoLoading ? "Dohvaćam lokaciju…" : "Koristi moju lokaciju"}
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Lat
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              inputMode="decimal"
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Lng
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              inputMode="decimal"
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Opis problema
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
          placeholder="Što se događa, gdje točno, postoji li opasnost…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
          Prvi redak postaje kratki naslov prijave na karti.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Kategorija
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Hitnost
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {URGENCY_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <input
                type="radio"
                name="urgency"
                value={o.value}
                checked={urgency === o.value}
                onChange={() => setUrgency(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Fotografija (opcionalno)
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Uslikaj ili odaberi iz galerije.
        </p>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Iz galerije
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Uslikaj
          </button>
        </div>
        {file ? (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Odabrano: {file.name}
          </p>
        ) : null}
      </div>

      {aiDescriptionEnabled ? (
        <AiSuggestButton
          file={file}
          onApply={(text) => {
            setDescription((prev) =>
              prev.trim() ? `${prev.trim()}\n\n${text}` : text,
            );
            setMessage({ type: "ok", text: "Prijedlog je dodan u opis." });
          }}
        />
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Šaljem…" : "Pošalji prijavu"}
      </button>
    </form>
  );
}
