import { NextResponse } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Neispravan JSON." },
      { status: 400 },
    );
  }

  const q =
    typeof body === "object" &&
    body !== null &&
    "query" in body &&
    typeof (body as { query: unknown }).query === "string"
      ? (body as { query: string }).query.trim()
      : "";

  if (q.length < 3) {
    return NextResponse.json(
      { error: "Upiši barem nekoliko znakova adrese ili ulice." },
      { status: 400 },
    );
  }

  const userAgent =
    process.env.NOMINATIM_USER_AGENT?.trim() ||
    "Zavrzlama/1.0 (gradjanske prijave; geokodiranje)";

  async function search(bounded: boolean): Promise<NominatimHit[]> {
    const url = new URL(NOMINATIM);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    url.searchParams.set("q", `${q}, Zagreb, Hrvatska`);
    url.searchParams.set("countrycodes", "hr");
    if (bounded) {
      url.searchParams.set("viewbox", "15.70,45.65,16.38,45.95");
      url.searchParams.set("bounded", "1");
    }

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Geokodiranje: HTTP ${res.status}`);
    }

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (x): x is NominatimHit =>
        typeof x === "object" &&
        x !== null &&
        "lat" in x &&
        "lon" in x &&
        typeof (x as NominatimHit).lat === "string" &&
        typeof (x as NominatimHit).lon === "string",
    );
  }

  try {
    let hits = await search(true);
    if (hits.length === 0) {
      hits = await search(false);
    }
    if (hits.length === 0) {
      return NextResponse.json(
        { error: "Adresa nije pronađena. Pokušaj drugačije formulirati ulicu." },
        { status: 404 },
      );
    }

    const best = hits[0]!;
    const lat = Number.parseFloat(best.lat);
    const lng = Number.parseFloat(best.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: "Neočekivani odgovor servisa za lokaciju." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      lat,
      lng,
      displayName: best.display_name ?? q,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nepoznata greška.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
