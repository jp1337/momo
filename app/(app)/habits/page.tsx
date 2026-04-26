import { redirect } from "next/navigation";

/** Habits is now part of the unified /progress page. */
export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const yearSuffix = params.year ? `&year=${params.year}` : "";
  redirect(`/progress?tab=habits${yearSuffix}`);
}
