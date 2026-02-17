import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const missingDbUrlMessage =
  "DATABASE_URL environment variable is required when executing database-backed routes.";

type QueryClient = ReturnType<typeof postgres>;
type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let queryClientInstance: QueryClient | null = null;
let dbInstance: DbClient | null = null;

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(missingDbUrlMessage);
  }
  return connectionString;
}

function ensureDb(): DbClient {
  if (dbInstance) {
    return dbInstance;
  }

  const connectionString = getConnectionString();
  queryClientInstance = postgres(connectionString);
  dbInstance = drizzle(queryClientInstance, { schema });
  return dbInstance;
}

function ensureQueryClient(): QueryClient {
  if (queryClientInstance) {
    return queryClientInstance;
  }

  ensureDb();
  return queryClientInstance!;
}

export const db = new Proxy({} as DbClient, {
  get(_target, prop, receiver) {
    const instance = ensureDb();
    const value = Reflect.get(instance as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export const queryClient = new Proxy({} as QueryClient, {
  get(_target, prop, receiver) {
    const instance = ensureQueryClient();
    const value = Reflect.get(instance as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export function getDb(): DbClient {
  return ensureDb();
}
