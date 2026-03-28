import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ skipped: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nisi prijavljen." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtjev." }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof Blob) || image.size === 0) {
    return NextResponse.json({ error: "Nedostaje slika." }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Slika je prevelika (najviše 4 MB)." },
      { status: 400 },
    );
  }

  const mime = image.type || "image/jpeg";
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Datoteka mora biti slika." }, { status: 400 });
  }

  const buf = Buffer.from(await image.arrayBuffer());
  const b64 = buf.toString("base64");
  const dataUrl = `data:${mime};base64,${b64}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 220,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "U jednoj ili dvije kratke rečenice na hrvatskom opiši što se vidi na slici, u kontekstu gradske prijave problema (npr. oštećenje, otpad, promet). Bez uvoda — samo opis.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("OpenAI error", res.status, errText);
    return NextResponse.json(
      { error: "AI servis trenutno nije dostupan." },
      { status: 502 },
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return NextResponse.json(
      { error: "Prazan odgovor modela." },
      { status: 502 },
    );
  }

  return NextResponse.json({ description: text });
}
