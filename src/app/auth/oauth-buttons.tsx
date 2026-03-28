"use client";

import {
  signInWithOAuth,
  type AuthActionState,
} from "@/app/auth/actions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

const initial: AuthActionState = undefined;

function OAuthSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
    >
      {pending ? "Preusmjeravam…" : label}
    </button>
  );
}

export function OAuthButtons({ next }: { next: string }) {
  const [state, formAction] = useActionState(signInWithOAuth, initial);

  return (
    <div className="mt-6 flex flex-col gap-3">
      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </p>
      ) : null}

      <form action={formAction} className="contents">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="provider" value="google" />
        <OAuthSubmit label="Nastavi s Googleom" />
      </form>
    </div>
  );
}
