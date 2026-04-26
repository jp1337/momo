import { redirect } from "next/navigation";

/** Achievements is now part of the unified /progress page. */
export default function AchievementsPage() {
  redirect("/progress?tab=achievements");
}
