import { createPublicClient, createWalletClient, http, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { baseRpcUrl } from "@/lib/config";
import { RECEIPT_SCHEMA, SCHEMA_REGISTRY_ABI, SCHEMA_REGISTRY_ADDRESS, normaliseKey, receiptSchemaUid } from "@/lib/eas";

const uid = receiptSchemaUid();
const publicClient = createPublicClient({ chain: base, transport: http(baseRpcUrl()) });
const existing = await publicClient.readContract({ address: SCHEMA_REGISTRY_ADDRESS, abi: SCHEMA_REGISTRY_ABI, functionName: "getSchema", args: [uid] });

// The registry rejects a second registration, so a repeat run reads first and spends nothing.
if (existing.uid === uid) {
  console.log("already registered, nothing spent");
} else {
  const key = process.env.ATTESTER_PRIVATE_KEY;
  if (!key) throw new Error("ATTESTER_PRIVATE_KEY is not set");
  const account = privateKeyToAccount(normaliseKey(key));
  const walletClient = createWalletClient({ account, chain: base, transport: http(baseRpcUrl()) });
  const hash = await walletClient.writeContract({
    address: SCHEMA_REGISTRY_ADDRESS,
    abi: SCHEMA_REGISTRY_ABI,
    functionName: "register",
    args: [RECEIPT_SCHEMA, zeroAddress, false],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`schema registration reverted: ${hash}`);
  console.log(`registered in ${hash}`);
}
console.log(`EAS_SCHEMA_UID=${uid}`);
console.log("Store it as a GitHub repo variable. It is not a secret.");
