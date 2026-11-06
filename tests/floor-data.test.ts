import { describe, expect, it } from "vitest";
import { fetchFloorData } from "@/crew/lib/floor-data";

describe("fetchFloorData", () => {
  it("keeps going and notes the failure when an endpoint is down", async () => {
    const fetchImpl = (async (url: string) => (String(url).includes("/api/stats") ? new Response("no", { status: 500 }) : new Response(JSON.stringify({ campaigns: [{ title: "A", url: "https://x.test" }], cells: { a: 1 } })))) as unknown as typeof fetch;
    const data = JSON.parse(await fetchFloorData(fetchImpl, new Date("2026-11-07T22:00:00Z")));
    expect(data.errors[0]).toContain("/api/stats");
    expect(data.campaigns[0]).toEqual({ title: "A" });
    expect(data.fetchedAt).toBe("2026-11-07T22:00:00.000Z");
  });
});
