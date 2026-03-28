import Link from "next/link";
import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ registered?: string; error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const q = await searchParams;
  const next = q.next ?? "/map";

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Prijava
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Zavrzlama — prijave u Zagrebu
        </p>

        {q.registered === "1" ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            Račun je kreiran. Možeš se prijaviti.
          </p>
        ) : null}

        {q.error === "auth" ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            Prijava nije uspjela. Pokušaj ponovno.
          </p>
        ) : null}

        <LoginForm next={next} />

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Nemaš račun?{" "}
          <Link
            href={
              next !== "/map"
                ? `/signup?next=${encodeURIComponent(next)}`
                : "/signup"
            }
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            Registracija
          </Link>
        </p>
        <p className="mt-3 text-center text-sm">
          <Link
            href="/"
            className="text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Natrag
          </Link>
        </p>
      </div>
    </div>
  );
}
