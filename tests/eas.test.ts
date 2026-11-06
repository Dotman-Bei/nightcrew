import { describe, expect, it } from "vitest";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { RECEIPT_SCHEMA, attesterFromEnv, encodeAttestationData, normaliseKey, receiptSchemaUid } from "@/lib/eas";

const fields = { founder_address: "0x0000000000000000000000000000000000000001" };

describe("the EAS attestation", () => {
  it("does not let a bad or missing key stop a shift from publishing", () => {
    const schema = receiptSchemaUid();
    expect(attesterFromEnv({ ATTESTER_PRIVATE_KEY: "not a key", EAS_SCHEMA_UID: schema })).toBeNull();
    expect(attesterFromEnv({ EAS_SCHEMA_UID: schema })).toBeNull();
    expect(attesterFromEnv({ ATTESTER_PRIVATE_KEY: "ab".repeat(32) })).toBeNull();
  });
  it("accepts a pasted key with spaces and no 0x", () => {
    const pasted = `  ${"ab".repeat(32)}\n`;
    expect(normaliseKey(pasted)).toBe(`0x${"ab".repeat(32)}`);
    expect(attesterFromEnv({ ATTESTER_PRIVATE_KEY: pasted, EAS_SCHEMA_UID: receiptSchemaUid() })).toBeTypeOf("function");
  });
  it("has the schema in the spec", () => {
    expect(RECEIPT_SCHEMA).toBe("bytes32 receiptHash,string shift,string outcome,bytes32 transcriptHash,bytes32 floorHash,string agentIdentity,string modelProvider,address founder,uint32 costCents");
    expect(receiptSchemaUid()).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it("round-trips its data, with zero hashes for a dark shift", () => {
    const hash = `0x${"ab".repeat(32)}`;
    const data = encodeAttestationData({ receiptHash: hash, shift: "3", outcome: "dark", transcriptHash: null, floorHash: null, agentIdentity: "night-crew", modelProvider: "Anthropic", founder: fields.founder_address, costCents: 41 });
    const decoded = decodeAbiParameters(parseAbiParameters(RECEIPT_SCHEMA), data);
    expect(decoded[0]).toBe(hash);
    expect(decoded[1]).toBe("3");
    expect(decoded[3]).toBe(`0x${"00".repeat(32)}`);
    expect(decoded[8]).toBe(41);
  });
});
