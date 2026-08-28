import { redirect } from "next/navigation";

/** Statistiken sind jetzt Teil der vereinheitlichten /progress-Seite. */
export default function StatsPage() {
  redirect("/progress?tab=stats");
}
