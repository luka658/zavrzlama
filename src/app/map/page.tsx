import Link from "next/link";
import MapViewLoader from "@/components/map/MapViewLoader";
import { getMapReports } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { isServiceOrAdmin } from "@/lib/auth-service";

export default async function MapPage() {
  const { data, error } = await getMapReports();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canAdmin = user ? await isServiceOrAdmin(supabase) : false;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Karta prijava
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Zagreb · OpenStreetMap
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            >
              Početna
            </Link>
            {user ? (
              <>
                <Link
                  href="/nova-prijava"
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Prijavi problem
                </Link>
                {canAdmin ? (
                  <Link
                    href="/admin"
                    className="rounded-lg border border-amber-600/50 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-950 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
                  >
                    Admin
                  </Link>
                ) : null}
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
                  >
                    Odjava
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login?next=/map"
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Prijava
                </Link>
                <Link
                  href="/signup?next=/map"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
                >
                  Registracija
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-6">
        {error ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            Učitavanje prijava nije uspjelo: {error}
          </div>
        ) : (
          <MapViewLoader reports={data ?? []} />
        )}
      </main>
    </div>
  );
}
