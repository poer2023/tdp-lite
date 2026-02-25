import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const publisherBaseUrl = process.env.PUBLISHER_BASE_URL?.trim() || "";

  return (
    <main className="min-h-screen bg-page-surface px-4 py-10 font-display">
      <div className="mx-auto max-w-2xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#111]">Admin Workspace</h1>
        <p className="mt-2 text-sm text-[#666]">
          Publisher runs as an independent service. It is optional and does not
          block Lite display routes.
        </p>

        <div className="mt-6 space-y-3">
          {publisherBaseUrl ? (
            <a
              href={publisherBaseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-[#111] transition-colors hover:border-black/20 hover:bg-black/5"
            >
              Open Publisher
            </a>
          ) : (
            <p className="rounded-xl border border-dashed border-black/15 px-4 py-3 text-sm text-[#666]">
              `PUBLISHER_BASE_URL` is not configured. Lite still works normally.
            </p>
          )}

          <div>
            <Link
              href="/"
              className="inline-flex items-center rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-[#111] transition-colors hover:border-black/20 hover:bg-black/5"
            >
              Back To Site
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
