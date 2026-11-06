import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

export type Statement = { sql: string; params?: unknown[] };

export type Db = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  /** Runs the statements in order, in one transaction. */
  batch(statements: Statement[]): Promise<void>;
};

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

function splitStatements(sqlText: string): string[] {
  return sqlText
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export async function applyMigrations(db: Db): Promise<void> {
  await db.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const applied = await db.query<{ name: string }>("select name from schema_migrations");
  const done = new Set(applied.rows.map((row) => row.name));
  for (const file of readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    const statements = splitStatements(readFileSync(join(MIGRATIONS_DIR, file), "utf8")).map((sql) => ({ sql }));
    statements.push({ sql: `insert into schema_migrations (name) values ('${file}')` });
    await db.batch(statements);
  }
}

export function neonDb(url: string): Db {
  const sql = neon(url, { fullResults: true });
  return {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
      const result = await sql.query(text, params);
      return { rows: result.rows as T[] };
    },
    async batch(statements) {
      await sql.transaction(statements.map((statement) => sql.query(statement.sql, statement.params ?? [])));
    },
  };
}

/** A real in-process Postgres with migrations applied. Used by tests and local pages. */
export async function memoryDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();
  const db: Db = {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
      const result = await pg.query<T>(text, params);
      return { rows: result.rows };
    },
    async batch(statements) {
      await pg.transaction(async (tx) => {
        for (const statement of statements) await tx.query(statement.sql, statement.params ?? []);
      });
    },
  };
  await applyMigrations(db);
  return db;
}

let current: Promise<Db> | null = null;

/** Tests inject their own database here. */
export function setDb(db: Db | null): void {
  current = db ? Promise.resolve(db) : null;
}

export function getDb(): Promise<Db> {
  if (!current) {
    const url = process.env.DATABASE_URL;
    current = url
      ? Promise.resolve(neonDb(url))
      : import("@/db/dev-seed").then(async ({ seedDevData }) => {
          const db = await memoryDb();
          await seedDevData(db);
          return db;
        });
  }
  return current;
}
