import { createPublicClient, createWalletClient, encodeAbiParameters, encodePacked, http, keccak256, parseAbiParameters, parseEventLogs, zeroAddress, zeroHash, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { EAS_ADDRESS, SCHEMA_REGISTRY_ADDRESS, baseRpcUrl } from "@/lib/config";

export const RECEIPT_SCHEMA = "bytes32 receiptHash,string shift,string outcome,bytes32 transcriptHash,bytes32 floorHash,string agentIdentity,string modelProvider,address founder,uint32 costCents";

export const SCHEMA_REGISTRY_ABI = [
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [{ name: "schema", type: "string" }, { name: "resolver", type: "address" }, { name: "revocable", type: "bool" }], outputs: [{ name: "", type: "bytes32" }] },
  { type: "function", name: "getSchema", stateMutability: "view", inputs: [{ name: "uid", type: "bytes32" }], outputs: [{ name: "", type: "tuple", components: [{ name: "uid", type: "bytes32" }, { name: "resolver", type: "address" }, { name: "revocable", type: "bool" }, { name: "schema", type: "string" }] }] },
] as const;

export const EAS_ABI = [
  {
    type: "function",
    name: "attest",
    stateMutability: "payable",
    inputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "schema", type: "bytes32" },
          {
            name: "data",
            type: "tuple",
            components: [
              { name: "recipient", type: "address" },
              { name: "expirationTime", type: "uint64" },
              { name: "revocable", type: "bool" },
              { name: "refUID", type: "bytes32" },
              { name: "data", type: "bytes" },
              { name: "value", type: "uint256" },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "event",
    name: "Attested",
    inputs: [
      { name: "recipient", type: "address", indexed: true },
      { name: "attester", type: "address", indexed: true },
      { name: "uid", type: "bytes32", indexed: false },
      { name: "schemaUID", type: "bytes32", indexed: true },
    ],
  },
] as const;

/** The UID the registry derives for a schema with no resolver and no revocation. */
export function receiptSchemaUid(): Hex {
  return keccak256(encodePacked(["string", "address", "bool"], [RECEIPT_SCHEMA, zeroAddress, false]));
}

export type AttestationFields = {
  receiptHash: string;
  shift: string;
  outcome: string;
  transcriptHash: string | null;
  floorHash: string | null;
  agentIdentity: string;
  modelProvider: string;
  founder: string;
  costCents: number;
};

export function encodeAttestationData(fields: AttestationFields): Hex {
  return encodeAbiParameters(parseAbiParameters(RECEIPT_SCHEMA), [
    fields.receiptHash as Hex,
    fields.shift,
    fields.outcome,
    (fields.transcriptHash ?? zeroHash) as Hex,
    (fields.floorHash ?? zeroHash) as Hex,
    fields.agentIdentity,
    fields.modelProvider,
    fields.founder as Hex,
    fields.costCents,
  ]);
}

export type AttestationResult = { uid: string; tx: string };
export type Attester = (fields: AttestationFields) => Promise<AttestationResult>;

export function viemAttester(privateKey: Hex, schemaUid: Hex, rpcUrl: string = baseRpcUrl()): Attester {
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: base, transport: http(rpcUrl) });
  return async (fields) => {
    const tx = await walletClient.writeContract({
      address: EAS_ADDRESS,
      abi: EAS_ABI,
      functionName: "attest",
      args: [{ schema: schemaUid, data: { recipient: zeroAddress, expirationTime: 0n, revocable: false, refUID: zeroHash, data: encodeAttestationData(fields), value: 0n } }],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    if (receipt.status !== "success") throw new Error(`attestation reverted: ${tx}`);
    const [event] = parseEventLogs({ abi: EAS_ABI, eventName: "Attested", logs: receipt.logs });
    if (!event) throw new Error(`no Attested event in ${tx}`);
    return { uid: event.args.uid, tx };
  };
}

/** A key pasted into a secret can pick up spaces or lose its 0x. */
export function normaliseKey(raw: string): Hex {
  const key = raw.trim();
  return (key.startsWith("0x") ? key : `0x${key}`) as Hex;
}

/** Null when a value is missing or unusable: the shift still publishes, with its attestation pending. Never logs the key. */
export function attesterFromEnv(env: Record<string, string | undefined>, rpcUrl?: string): Attester | null {
  const key = env.ATTESTER_PRIVATE_KEY?.trim();
  const schema = env.EAS_SCHEMA_UID?.trim();
  if (!key || !schema) return null;
  try {
    return viemAttester(normaliseKey(key), schema as Hex, rpcUrl);
  } catch {
    console.error("ATTESTER_PRIVATE_KEY is not a valid key, so attestation stays pending.");
    return null;
  }
}

export { SCHEMA_REGISTRY_ADDRESS };
