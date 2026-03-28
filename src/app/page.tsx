import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Zavrzlama
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Prijave problema u Zagrebu. Karta je javna; za slanje prijave trebaš
          račun.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/map"
            className="flex w-full items-center justify-center rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
          >
            {user ? "Otvori kartu" : "Pogledaj kartu"}
          </Link>

          {user ? (
            <Link
              href="/nova-prijava"
              className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Prijavi problem
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Prijava
              </Link>
              <Link
                href="/signup"
                className="flex w-full items-center justify-center rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
              >
                Registracija
              </Link>
            </>
          )}
        </div>

        {user ? (
          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Prijavljeni ste — odjava je na karti u izborniku.
          </p>
        ) : null}
      </div>
    </div>
  );
}
