import { ContentManager } from "@/components/ContentManager";
import { requirePublisherPageAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  await requirePublisherPageAuth("/manage");
  return <ContentManager />;
}
