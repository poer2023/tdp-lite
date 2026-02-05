import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import { apiKeys } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface AuthResult {
  authenticated: boolean;
  apiKeyId?: string;
  permissions?: string[];
  error?: string;
}

/**
 * Verify API key from Authorization header
 * Format: Bearer tdp_sk_xxxxx
 */
export async function verifyApiKey(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return { authenticated: false, error: "Missing Authorization header" };
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return { authenticated: false, error: "Invalid Authorization format" };
  }

  if (!token.startsWith("tdp_sk_")) {
    return { authenticated: false, error: "Invalid API key format" };
  }

  try {
    // Get all API keys and check against hash
    const keys = await db.select().from(apiKeys);

    for (const key of keys) {
      const isValid = await bcrypt.compare(token, key.keyHash);
      if (isValid) {
        return {
          authenticated: true,
          apiKeyId: key.id,
          permissions: key.permissions,
        };
      }
    }

    return { authenticated: false, error: "Invalid API key" };
  } catch (error) {
    console.error("Auth verification error:", error);
    return { authenticated: false, error: "Authentication failed" };
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(
  permissions: string[] | undefined,
  required: string
): boolean {
  if (!permissions) return false;
  return permissions.includes("*") || permissions.includes(required);
}

/**
 * Middleware helper for protected routes
 */
export async function requireAuth(
  request: NextRequest,
  requiredPermission?: string
): Promise<NextResponse | null> {
  const auth = await verifyApiKey(request);

  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  if (requiredPermission && !hasPermission(auth.permissions, requiredPermission)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return null; // Authentication passed
}

/**
 * Generate a new API key
 */
export async function generateApiKey(): Promise<string> {
  const { nanoid } = await import("nanoid");
  return `tdp_sk_${nanoid(32)}`;
}

/**
 * Hash an API key for storage
 */
export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}
