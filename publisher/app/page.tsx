import { PublisherStudio } from "@/components/PublisherStudio";
import { requirePublisherPageAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PublisherPage() {
  await requirePublisherPageAuth("/");
  return <PublisherStudio />;
}
