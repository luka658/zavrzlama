"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, ReportStatus, ReportUrgency } from "@/lib/types";

type Row = {
  id: string;
  title: string;
  description: string | null;
  status: ReportStatus;
  urgency: ReportUrgency;
  created_at: string;
  lat: number;
  lng: number;
  category_id: string;
  image_path: string | null;
  user_id: string;
  categories: { name: string } | null;
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Otvoreno",
  in_progress: "U rješavanju",
  resolved: "Riješeno",
  archived: "Arhivirano",
};

const URGENCY_LABELS: Record<ReportUrgency, string> = {
  low: "Nije hitno",
  medium: "Srednje",
  high: "Hitno",
  critical: "Kritično",
};

const STATUSES: ReportStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "archived",
];

export function AdminReportsPanel({
  initialRows,
  categories,
}: {
  initialRows: Row[];
  categories: Pick<Category, "id" | "name">[];
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (categoryFilter !== "all" && r.category_id !== categoryFilter)
        return false;
      return true;
    });
  }, [rows, statusFilter, categoryFilter]);

  async function reload() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: qErr } = await supabase
      .from("reports")
      .select(
        "id, title, description, status, urgency, created_at, lat, lng, category_id, image_path, user_id, categories ( name )",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (qErr) {
      setError(qErr.message);
      return;
    }
    const normalized = (data ?? []).map((raw) => {
      const r = raw as Omit<Row, "categories"> & {
        categories: { name: string } | { name: string }[] | null;
      };
      const c = r.categories;
      const categories = Array.isArray(c) ? (c[0] ?? null) : c;
      return { ...r, categories } satisfies Row;
    });
    setRows(normalized);
  }

  async function setStatus(id: string, status: ReportStatus) {
    setUpdatingId(id);
    setError(null);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", id);
    setUpdatingId(null);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Status
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ReportStatus | "all")
            }
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">Svi</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Kategorija
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">Sve</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
        >
          {loading ? "Osvježavam…" : "Osvježi"}
        </button>
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Prikazano: {filtered.length} od {rows.length}
      </p>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Kreirano
              </th>
              <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Naslov
              </th>
              <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Kategorija
              </th>
              <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Hitnost
              </th>
              <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-b border-zinc-100 dark:border-zinc-800/80"
              >
                <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {new Date(r.created_at).toLocaleString("hr-HR")}
                </td>
                <td className="max-w-[220px] px-3 py-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {r.title}
                  </span>
                  {r.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {r.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-zinc-400">
                    {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                  </p>
                </td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                  {r.categories?.name ?? "—"}
                </td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                  {URGENCY_LABELS[r.urgency] ?? r.urgency}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={r.status}
                    disabled={updatingId === r.id}
                    onChange={(e) =>
                      void setStatus(r.id, e.target.value as ReportStatus)
                    }
                    className="w-full min-w-[140px] rounded-lg border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Nema prijava za odabrane filtere.
          </p>
        ) : null}
      </div>
    </div>
  );
}
