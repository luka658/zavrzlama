/** Usklađeno s Postgres enumima u migraciji. */
export type ReportUrgency = "low" | "medium" | "high" | "critical";

export type ReportStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "archived";

export type Report = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  category_id: string;
  urgency: ReportUrgency;
  status: ReportStatus;
  /** Putanja u Storage bucketu (npr. `{user_id}/foto.jpg`). */
  image_path: string | null;
  /** Težina za heatmap / agregacije (može se kasnije računati iz kategorije). */
  score: number;
  created_at: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  inherent_weight: number;
};

export type AgeBracket = "under_18" | "18_30" | "31_50" | "51_65" | "over_65";

export type Profile = {
  user_id: string;
  neighborhood: string | null;
  age_bracket: AgeBracket | null;
  created_at: string;
};

export type ReportInsert = Omit<
  Report,
  "id" | "created_at" | "status" | "score"
> & {
  status?: ReportStatus;
  score?: number;
};

