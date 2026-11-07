import { describe, expect, it } from "vitest";
import { seedDevData } from "@/db/dev-seed";
import { memoryDb } from "@/lib/db";
import { floorView, receiptView, towerView, voteView } from "@/lib/read-models";

describe("the dev seed", () => {
  it("gives every page something real to show", async () => {
    const db = await memoryDb();
    await seedDevData(db);
    const now = new Date();
    const tower = await towerView(db, now);
    expect(tower.floorsLit).toBe(2);
    expect(tower.latest?.name).toBe("Release schedule table");
    expect(tower.top.length).toBe(5);
    expect(tower.rows.some((row) => row.kind === "dark")).toBe(true);
    expect((await voteView(db, now, 1)).openCount).toBe(8);
    const receipt = await receiptView(db, "1");
    expect(receipt?.transcript.length).toBeGreaterThan(3);
    expect(receipt?.diff).toContain("+++");
    expect(receipt?.tests.length).toBe(3);
    expect((await floorView(db, "1"))?.floor?.name).toBe("Staking share calculator");
    expect((await floorView(db, "2"))?.floor).toBeNull();
    expect((await floorView(db, "2"))?.reason).toContain("gate rejected");
  });
  it("keeps rehearsals off the tower", async () => {
    const db = await memoryDb();
    await seedDevData(db);
    const tower = await towerView(db, new Date());
    expect(JSON.stringify(tower.rows)).not.toContain("Tip calculator");
  });
});
