import { redirect } from "next/navigation";

// Option A: Unified History removed. History is now embedded inside each feature tool.
export default function OldHistoryPage() {
  redirect("/dashboard");
}
