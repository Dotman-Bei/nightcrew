import { describe, expect, it } from "vitest";
import { apiStakeReader } from "@/lib/stake";

describe("apiStakeReader", () => {
  it("reads stakedBalance and labels it current at tally", async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ stakedBalance: "5" }))) as typeof fetch;
    const result = await apiStakeReader(fetchImpl)(["0xa"]);
    expect(result.mode).toBe("current-at-tally");
    expect(result.staked.get("0xa")).toBe(5n);
  });
  it("reports unavailable and counts stake as zero when the API fails", async () => {
    const fetchImpl = (async () => new Response("no", { status: 500 })) as typeof fetch;
    const result = await apiStakeReader(fetchImpl)(["0xa"]);
    expect(result.mode).toBe("unavailable");
    expect(result.staked.size).toBe(0);
  });
});
