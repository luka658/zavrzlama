import type { Category, ReportUrgency } from "@/lib/types";

/**
 * Hitnost se ne bira ručno: kombinacija teksta prijave i težine kategorije.
 * Namjerno konzervativno — "critical" samo uz jasne signale opasnosti.
 */
export function computeReportUrgency(
  category: Category,
  description: string,
): ReportUrgency {
  const text = description.trim().toLowerCase();
  const firstLine = text.split(/\n/)[0] ?? "";
  const haystack = `${firstLine} ${text}`;

  let tier = 0;
  if (
    /požar|vatra|eksploz|struj\w*\s*u\w*|udar\w*\s*struj|život\w*\s*ugrož|smrt|gubitak\s*život|utapanj|pod\s*vodom|potop|plin\w*\s*(opasn|curi|pukn|miris)/i.test(
      haystack,
    )
  ) {
    tier = 4;
  } else if (
    /hitn\w*\s*pomoć|opasn\w*|ozljeđ|povrijeđ|ozljed|poplav|evakuac|ruševin|klizan|klizav|rupe\s*u\s*ceste|velik\w*\s*rup/i.test(
      haystack,
    )
  ) {
    tier = 3;
  } else if (
    /ošteć|curi|ne\s+radi|puknu|rasvjet|semafor|odvod|odvoz|vandal|graffiti|bučn|smrad|otpaci/i.test(
      haystack,
    )
  ) {
    tier = 2;
  } else {
    tier = 1;
  }

  // inherent_weight tipično 1–2+: blago pomiče prema gore
  const w = category.inherent_weight;
  const weightBump = Math.min(1.2, Math.max(0, (w - 0.85) * 1.8));
  const score = tier + weightBump;

  if (score >= 4.6) return "critical";
  if (score >= 3.4) return "high";
  if (score >= 2.1) return "medium";
  return "low";
}

export function urgencyLabelHr(u: ReportUrgency): string {
  switch (u) {
    case "critical":
      return "Kritično";
    case "high":
      return "Visoko";
    case "medium":
      return "Srednje";
    case "low":
      return "Nisko";
    default:
      return u;
  }
}
