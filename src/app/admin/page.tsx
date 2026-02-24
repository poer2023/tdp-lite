import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const publisherBaseUrl = process.env.PUBLISHER_BASE_URL;

  if (!publisherBaseUrl) {
    redirect("/");
  }

  redirect(publisherBaseUrl);
}
