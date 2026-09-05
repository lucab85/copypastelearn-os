import postgres from "postgres";

type DbClient = ReturnType<typeof postgres>;

let client: DbClient | null | undefined;

export function getDb(): DbClient | null {
  if (client !== undefined) return client;
  const url = process.env.DATABASE_URL;
  if (!url) return (client = null);
  client = postgres(url, {
    max: 2,
    prepare: false,
    ssl: process.env.DATABASE_SSL === "false" ? false : "require",
    idle_timeout: 20,
  });
  return client;
}

export async function pingDb() {
  const sql = getDb();
  if (!sql) return { configured: false, ok: false };
  try {
    await sql`select 1 as ok`;
    return { configured: true, ok: true };
  } catch (error) {
    return { configured: true, ok: false, error: error instanceof Error ? error.message : "database error" };
  }
}
