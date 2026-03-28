"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";
import {
  computeReportUrgency,
  urgencyLabelHr,
} from "@/lib/report-urgency";
import { AiSuggestButton } from "./ai-suggest-button";

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

  const [streetQuery, setStreetQuery] = useState("");
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  const computedUrgency = useMemo(() => {
    if (!selectedCategory) return null;
    return computeReportUrgency(selectedCategory, description);
  }, [selectedCategory, description]);

  const pickFile = (f: File | null) => {
    setFile(f);
    if (f) {
      setMessage(null);
    }
  };

  async function resolveAddress() {
    setGeocodeLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: streetQuery }),
      });
      const data = (await res.json()) as {
        error?: string;
        lat?: number;
        lng?: number;
        displayName?: string;
      };
      if (!res.ok) {
        setMessage({
          type: "err",
          text: data.error ?? "Geokodiranje nije uspjelo.",
        });
        return;
      }
      if (
        typeof data.lat !== "number" ||
        typeof data.lng !== "number" ||
        Number.isNaN(data.lat) ||
        Number.isNaN(data.lng)
      ) {
        setMessage({
          type: "err",
          text: "Neočekivani odgovor servisa za adresu.",
        });
        return;
      }
      setLat(data.lat);
      setLng(data.lng);
      setPlaceLabel(data.displayName ?? streetQuery.trim());
      setMessage({ type: "ok", text: "Adresa pronađena." });
    } catch {
      setMessage({
        type: "err",
        text: "Mrežna greška pri traženju adrese.",
      });
    } finally {
      setGeocodeLoading(false);
    }
  }

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
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setPlaceLabel("Trenutna lokacija (GPS)");
        setGeoLoading(false);
        setMessage({ type: "ok", text: "Lokacija s uređaja učitana." });
      },
      () => {
        setGeoLoading(false);
        setMessage({
          type: "err",
          text: "GPS nije dostupan. Pokušaj unijeti ulicu i pritisnuti „Pronađi adresu”.",
        });
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (lat === null || lng === null) {
      setMessage({
        type: "err",
        text: "Postavi lokaciju: upiši ulicu i „Pronađi adresu” ili koristi GPS.",
      });
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setMessage({ type: "err", text: "Koordinate su izvan dopuštenog raspona." });
      return;
    }
    const title = deriveTitleFromDescription(description);
    if (!title) {
      setMessage({ type: "err", text: "Unesi opis problema (barem prvi redak)." });
      return;
    }
    if (!categoryId || !selectedCategory) {
      setMessage({ type: "err", text: "Odaberi kategoriju." });
      return;
    }

    const urgency = computeReportUrgency(selectedCategory, description);

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

    const score = selectedCategory.inherent_weight ?? 1;

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
      lat,
      lng,
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
    setStreetQuery("");
    setPlaceLabel(null);
    setLat(null);
    setLng(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
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
          Lokacija (ulica i kućni broj)
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Upiši adresu u Zagrebu, zatim „Pronađi adresu”. Možeš i koristiti GPS ako
          si na mjestu događaja.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={streetQuery}
            onChange={(e) => setStreetQuery(e.target.value)}
            placeholder="Npr. Ilica 42 ili Trg bana Jelačića"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <button
            type="button"
            onClick={() => void resolveAddress()}
            disabled={geocodeLoading || streetQuery.trim().length < 3}
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {geocodeLoading ? "Tražim…" : "Pronađi adresu"}
          </button>
        </div>
        <button
          type="button"
          onClick={useGeolocation}
          disabled={geoLoading}
          className="mt-3 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          {geoLoading ? "Dohvaćam GPS…" : "Koristi moju lokaciju (GPS)"}
        </button>
        {placeLabel !== null && lat !== null && lng !== null ? (
          <p className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
            <span className="font-medium">Postavljeno:</span> {placeLabel}
            <span className="mt-1 block font-mono text-zinc-500 dark:text-zinc-400">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          </p>
        ) : (
          <p className="mt-3 text-xs text-amber-800 dark:text-amber-200/90">
            Lokacija još nije postavljena — potrebna je prije slanja prijave.
          </p>
        )}
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

      {computedUrgency ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Procijenjena hitnost
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Računa se automatski iz opisa i kategorije:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {urgencyLabelHr(computedUrgency)}
            </span>
          </p>
        </div>
      ) : null}

      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Fotografija (opcionalno)
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
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="mt-3 w-full rounded-xl bg-zinc-900 px-4 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Slikaj
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="mt-2 w-full text-center text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Ili odaberi fotografiju iz galerije
        </button>
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
