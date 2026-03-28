import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewReportForm } from "./new-report-form";
import type { Category } from "@/lib/types";

export default async function NovaPrijavaPage() {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, slug, name, inherent_weight")
    .order("name");

  if (error || !categories?.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-red-600 dark:text-red-400">
          Kategorije se ne mogu učitati. Pokušaj kasnije.
        </p>
        <Link
          href="/map"
          className="mt-4 inline-block text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          Natrag na kartu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Lokacija (GPS ili ručno), opis, kategorija i po želji fotografija s kamere
        ili iz galerije.
      </p>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <NewReportForm
          categories={categories as Category[]}
          aiDescriptionEnabled={Boolean(process.env.OPENAI_API_KEY)}
        />
      </div>

      <Link
        href="/map"
        className="mt-8 text-center text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        Natrag na kartu
      </Link>
    </div>
  );
}
