import { redirect } from "next/navigation";

/** Stara ruta — glavni prikaz nakon prijave je karta. */
export default function DashboardPage() {
  redirect("/map");
}
