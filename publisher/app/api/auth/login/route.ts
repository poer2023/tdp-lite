import {
  buildPublisherLoginSuccessResponse,
  normalizePublisherNextPath,
  publisherAuthConfigured,
  redirectToPublisherLogin,
  validatePublisherCredentials,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!publisherAuthConfigured()) {
    return redirectToPublisherLogin(request, "config");
  }

  const formData = await request.formData();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const nextPath = normalizePublisherNextPath(
    String(formData.get("next") || "/")
  );

  if (!validatePublisherCredentials(username, password)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "invalid");
    url.searchParams.set("next", nextPath);
    return Response.redirect(url, 303);
  }

  return buildPublisherLoginSuccessResponse(request, nextPath);
}
