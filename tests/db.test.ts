import { describe, expect, it } from "vitest";
import { applyMigrations, memoryDb } from "@/lib/db";

describe("the database", () => {
  it("applies the migrations once, and a second run changes nothing", async () => {
    const db = await memoryDb();
    await applyMigrations(db);
    const applied = await db.query<{ name: string }>("select name from schema_migrations");
    expect(applied.rows.map((row) => row.name)).toEqual(["001_init.sql"]);
  });
  it("has every table the spec names", async () => {
    const db = await memoryDb();
    const tables = await db.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public' order by table_name");
    const names = tables.rows.map((row) => row.table_name);
    for (const name of ["floors", "proposals", "rate_events", "receipt_parts", "receipts", "shifts", "vetoes", "votes", "waitlist"]) expect(names).toContain(name);
  });
  it("allows only one open shift", async () => {
    const db = await memoryDb();
    await db.query("insert into shifts (slug, label, status, closes_at) values ('1', 'scheduled', 'open', now())");
    await expect(db.query("insert into shifts (slug, label, status, closes_at) values ('2', 'scheduled', 'open', now())")).rejects.toThrow();
  });
  it("runs a batch in one transaction: one bad statement undoes the rest", async () => {
    const db = await memoryDb();
    await expect(db.batch([
      { sql: "insert into shifts (slug, label, status, closes_at) values ('1', 'scheduled', 'closed', now())" },
      { sql: "insert into shifts (slug, label, status, closes_at) values ('1', 'scheduled', 'closed', now())" },
    ])).rejects.toThrow();
    expect((await db.query("select * from shifts")).rows).toEqual([]);
  });
  it("binds parameters, so text cannot become SQL", async () => {
    const db = await memoryDb();
    const hostile = "x'); drop table shifts; --";
    await db.query("insert into shifts (slug, label, status, closes_at) values ($1, 'scheduled', 'closed', now())", [hostile]);
    const rows = await db.query<{ slug: string }>("select slug from shifts");
    expect(rows.rows[0].slug).toBe(hostile);
  });
});
