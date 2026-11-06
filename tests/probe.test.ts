import { describe, expect, it } from "vitest";
import { decideProbe, parseProbeReport } from "@/crew/lib/probe";
import { SEALED_NETWORKING, SEALED_TOOLS } from "@/crew/lib/provisioning";

describe("the sandbox settings", () => {
  it("allow no hosts, no packages and no MCP", () => {
    expect(SEALED_NETWORKING).toEqual({ type: "limited", allowed_hosts: [], allow_package_managers: false, allow_mcp_servers: false });
  });
  it("turn the web tools off and never pause for approval", () => {
    const tools = SEALED_TOOLS[0];
    expect(tools.configs.map((config) => [config.name, config.enabled])).toEqual([["web_fetch", false], ["web_search", false]]);
    expect(tools.default_config.permission_policy.type).toBe("always_allow");
  });
});

describe("the runtime probe", () => {
  it("reads a report with or without a code fence", () => {
    expect(parseProbeReport('```json\n{"node":"v22","curl":"000 exit=6","chromium":"ok"}\n```')).toEqual({ node: "v22", curl: "000 exit=6", chromium: "ok" });
    expect(parseProbeReport("no json here")).toBeNull();
  });
  it("applies the decision table", () => {
    expect(decideProbe({ node: "v22", curl: "000 exit=6", chromium: "ok" }).decision).toBe("managed-agents");
    expect(decideProbe({ node: "v22", curl: "000 exit=6", chromium: "Error: no browser" }).decision).toBe("managed-agents-no-chromium");
    expect(decideProbe({ node: "v22", curl: "200 exit=0", chromium: "ok" }).decision).toBe("fallback");
    expect(decideProbe(null, "403 no access").decision).toBe("fallback");
  });
});
