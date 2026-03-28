"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";

export type AuthActionState = { error?: string } | void;

const OAUTH_PROVIDERS = ["google"] as const satisfies readonly Provider[];

function parseNext(raw: string): string {
  const next = raw.trim() || "/map";
  return next.startsWith("/") ? next : "/map";
}

export async function signInWithOAuth(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const provider = String(formData.get("provider") ?? "");
  const next = parseNext(String(formData.get("next") ?? "/map"));

  if (!OAUTH_PROVIDERS.includes(provider as (typeof OAUTH_PROVIDERS)[number])) {
    return { error: "Nepoznat pružatelj prijave." };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { error: error.message };
  }
  if (data.url) {
    redirect(data.url);
  }
  return { error: "Nije moguće otvoriti stranicu za prijavu." };
}

export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/map").trim() || "/map";

  if (!email || !password) {
    return { error: "Unesi e-mail i lozinku." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/map");
}

export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Unesi e-mail i lozinku." };
  }
  if (password.length < 6) {
    return { error: "Lozinka treba imati barem 6 znakova." };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  if (data.session) {
    redirect("/map");
  }
  redirect("/login?registered=1");
}
