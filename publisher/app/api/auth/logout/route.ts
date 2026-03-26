import { buildPublisherLogoutResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return buildPublisherLogoutResponse(request);
}
