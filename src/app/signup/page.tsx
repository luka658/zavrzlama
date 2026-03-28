import Link from "next/link";
import { SignupForm } from "./signup-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const q = await searchParams;
  const next = q.next ?? "/map";

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Registracija
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Kreiraj račun za slanje prijava.
        </p>

        <SignupForm next={next} />

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Već imaš račun?{" "}
          <Link
            href={
              next !== "/map"
                ? `/login?next=${encodeURIComponent(next)}`
                : "/login"
            }
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            Prijava
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
