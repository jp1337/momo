import { redirect } from "next/navigation";

/** Weekly Review is now part of the unified /progress page. */
export default function ReviewPage() {
  redirect("/progress?tab=review");
}
