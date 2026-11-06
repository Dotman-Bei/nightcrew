import { applyMigrations, neonDb } from "@/lib/db";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("db:migrate skipped: DATABASE_URL is not set");
  process.exit(0);
}
await applyMigrations(neonDb(url));
console.log("db:migrate done");
