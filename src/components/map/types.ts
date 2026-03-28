import type { ReportStatus, ReportUrgency } from "@/lib/types";

/** Podaci za kartu (javno čitanje, bez osjetljivih polja). */
export type MapReport = {
  id: string;
  lat: number;
  lng: number;
  status: ReportStatus;
  score: number;
  category_slug: string;
  category_name: string;
  title: string;
  description: string | null;
  urgency: ReportUrgency;
};
