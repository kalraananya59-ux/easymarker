import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// Lazily constructed — building at module scope runs during Next.js's
// "collecting page data" build step, which imports every route module. That
// would make a missing DATABASE_URL break the whole build instead of just
// the routes that actually touch the database. Same pattern as lib/storage.ts
// and lib/paddle.ts in apps/web.
let instance: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  if (!instance) {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL environment variable is required");
    instance = drizzle(postgres(url), { schema });
  }
  return instance;
}

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export * from "./schema";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";
export { eq, and, or, ne, lt, gte, inArray, desc, sql, count, isNull } from "drizzle-orm";
