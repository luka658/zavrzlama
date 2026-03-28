import Link from "next/link";

export default function NovaPrijavaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-100 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Zavrzlama
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Prijavi problem
            </h1>
          </div>
          <Link
            href="/map"
            className="shrink-0 text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Karta
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
