import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isServiceOrAdmin } from "@/lib/auth-service";

export default async function AdminPage() {
  const supabase = await createClient();
  const allowed = await isServiceOrAdmin(supabase);
  if (!allowed) {
    redirect("/map");
  }

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Zavrzlama
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Administracija prijava
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Panel za upravljanje prijavama još nije spojen u ovoj grani.
          </p>
        </div>
        <Link
          href="/map"
          className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Karta
        </Link>
      </header>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Za pregled na karti koristi{" "}
        <Link href="/map" className="font-medium underline-offset-4 hover:underline">
          Karta
        </Link>
        .
      </p>
    </div>
  );
}
