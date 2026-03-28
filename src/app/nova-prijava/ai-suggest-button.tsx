"use client";

import { useState } from "react";

type Props = {
  file: File | null;
  onApply: (text: string) => void;
};

export function AiSuggestButton({ file, onApply }: Props) {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function run() {
    if (!file) {
      setHint("Prvo odaberi sliku.");
      return;
    }
    setLoading(true);
    setHint(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ai/suggest-description", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        skipped?: boolean;
        description?: string;
        error?: string;
      };
      if (data.skipped) return;
      if (!res.ok || data.error) {
        setHint(data.error ?? "AI prijedlog nije uspio.");
        return;
      }
      if (data.description) onApply(data.description);
    } catch {
      setHint("Mrežna greška pri AI prijedlogu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading || !file}
        className="w-fit rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
      >
        {loading ? "AI…" : "AI prijedlog opisa iz slike"}
      </button>
      {hint ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">{hint}</p>
      ) : null}
    </div>
  );
}
