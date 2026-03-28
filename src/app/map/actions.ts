"use server";

import { createClient } from "@/lib/supabase/server";
import type { MapReport } from "@/components/map/types";

type CategoryEmbed = { slug: string; name: string };

type ReportRow = {
  id: string;
  lat: number;
  lng: number;
  status: MapReport["status"];
  score: number;
  title: string;
  description: string | null;
  urgency: MapReport["urgency"];
  /** PostgREST / Supabase tip ponekad vraća kao objekt (M:1), ponekad kao polje u nizu. */
  categories: CategoryEmbed | CategoryEmbed[] | null;
};

export async function getMapReports(): Promise<{
  data: MapReport[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .select(
      `
      id,
      lat,
      lng,
      status,
      score,
      title,
      description,
      urgency,
      categories ( slug, name )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const rows = (data ?? []) as unknown as ReportRow[];
  const mapped: MapReport[] = rows.map((r) => {
    const c = r.categories;
    const cat: CategoryEmbed | null = Array.isArray(c) ? (c[0] ?? null) : c;
    return {
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      status: r.status,
      score: Number(r.score),
      title: r.title,
      description: r.description,
      urgency: r.urgency,
      category_slug: cat?.slug ?? "nepoznato",
      category_name: cat?.name ?? "Nepoznata kategorija",
    };
  });

  return { data: mapped, error: null };
}
