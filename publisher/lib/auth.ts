import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "tdp_publisher_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

type PublisherAuthConfig = {
  username: string;
  password: string;
  sessionSecret: string;
};

type PublisherSession = {
  username: string;
  expiresAt: number;
};

function getPublisherAuthConfig(): PublisherAuthConfig | null {
  const username = process.env.PUBLISHER_AUTH_USERNAME?.trim() || "";
  const password = process.env.PUBLISHER_AUTH_PASSWORD || "";
  const sessionSecret = process.env.PUBLISHER_SESSION_SECRET || "";

  if (!username || !password || !sessionSecret) {
    return null;
  }

  return { username, password, sessionSecret };
}

function hmacDigest(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest();
}

function secureEquals(secret: string, actual: string, expected: string) {
  return timingSafeEqual(
    hmacDigest(secret, actual),
    hmacDigest(secret, expected)
  );
}

function signSessionPayload(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSessionToken(config: PublisherAuthConfig) {
  const payload = Buffer.from(
    JSON.stringify({
      username: config.username,
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
    })
  ).toString("base64url");

  const signature = signSessionPayload(config.sessionSecret, payload);
  return `${payload}.${signature}`;
}

function parseSessionToken(
  config: PublisherAuthConfig,
  token: string | undefined
): PublisherSession | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(config.sessionSecret, payload);
  if (!secureEquals(config.sessionSecret, signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as PublisherSession;

    if (
      !parsed ||
      typeof parsed.username !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function sanitizeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }
  if (value.startsWith("//")) {
    return "/";
  }
  return value;
}

export function publisherAuthConfigured() {
  return getPublisherAuthConfig() !== null;
}

export function validatePublisherCredentials(username: string, password: string) {
  const config = getPublisherAuthConfig();
  if (!config) {
    return false;
  }

  return (
    secureEquals(config.sessionSecret, username.trim(), config.username) &&
    secureEquals(config.sessionSecret, password, config.password)
  );
}

export async function getPublisherSession() {
  const config = getPublisherAuthConfig();
  if (!config) {
    return null;
  }

  const cookieStore = await cookies();
  return parseSessionToken(
    config,
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );
}

export async function requirePublisherPageAuth(nextPath = "/") {
  const session = await getPublisherSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`);
  }
  return session;
}

export async function requirePublisherApiAuth() {
  const session = await getPublisherSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function redirectToPublisherLogin(request: Request, reason?: string) {
  const url = new URL("/login", request.url);
  if (reason) {
    url.searchParams.set("error", reason);
  }
  return NextResponse.redirect(url, { status: 303 });
}

export function buildPublisherLoginSuccessResponse(
  request: Request,
  nextPath: string | null | undefined
) {
  const config = getPublisherAuthConfig();
  if (!config) {
    return redirectToPublisherLogin(request, "config");
  }

  const response = NextResponse.redirect(
    new URL(sanitizeNextPath(nextPath), request.url),
    { status: 303 }
  );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(config),
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}

export function buildPublisherLogoutResponse(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}

export function normalizePublisherNextPath(nextPath: string | null | undefined) {
  return sanitizeNextPath(nextPath);
}
