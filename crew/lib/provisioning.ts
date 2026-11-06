import type Anthropic from "@anthropic-ai/sdk";

/** Deny by default: no hosts, no package managers, no MCP. */
export const SEALED_NETWORKING = {
  type: "limited",
  allowed_hosts: [],
  allow_package_managers: false,
  allow_mcp_servers: false,
} as const;

/** Tools run without approval: the sandbox holds nothing worth protecting, and a pause would hang an unattended shift. */
export const SEALED_TOOLS = [
  {
    type: "agent_toolset_20260401",
    default_config: { enabled: true, permission_policy: { type: "always_allow" } },
    configs: [
      { name: "web_fetch", enabled: false },
      { name: "web_search", enabled: false },
    ],
  },
] as const;

export type CrewResources = { agentId: string; environmentId: string };

export async function createCrewResources(client: Anthropic, name: string, model: string): Promise<CrewResources> {
  const environment = await client.beta.environments.create({
    name: `${name}-sandbox`,
    config: { type: "cloud", networking: { ...SEALED_NETWORKING, allowed_hosts: [] } },
  });
  const agent = await client.beta.agents.create({
    name,
    model,
    tools: SEALED_TOOLS as unknown as NonNullable<Parameters<typeof client.beta.agents.create>[0]["tools"]>,
  });
  return { agentId: agent.id, environmentId: environment.id };
}
