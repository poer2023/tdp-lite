import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const usePublisherV2 = process.env.PUBLISHER_V2_ENABLED === "true";
  const publisherBaseUrl = process.env.PUBLISHER_BASE_URL;

  if (usePublisherV2 && publisherBaseUrl) {
    redirect(publisherBaseUrl);
  }

  return (
    <AdminDashboard user={session.user} />
  );
}
