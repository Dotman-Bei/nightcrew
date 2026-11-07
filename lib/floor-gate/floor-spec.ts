import { z } from "zod";

const selector = z.string().min(1).max(200);

export const FloorStep = z.discriminatedUnion("op", [
  z.object({ op: z.literal("fill"), selector, value: z.string().max(500) }),
  z.object({ op: z.literal("click"), selector }),
  z.object({ op: z.literal("select"), selector, value: z.string().max(200) }),
  z.object({ op: z.literal("press"), selector, key: z.string().min(1).max(40) }),
  z.object({ op: z.literal("expectText"), selector, contains: z.string().max(500) }),
  z.object({ op: z.literal("expectValue"), selector, equals: z.string().max(500) }),
  z.object({ op: z.literal("expectVisible"), selector }),
  z.object({ op: z.literal("expectCount"), selector, count: z.number().int().min(0).max(1000) }),
]);
export type FloorStep = z.infer<typeof FloorStep>;

export const FloorTest = z.object({
  name: z.string().min(1).max(120),
  steps: z.array(FloorStep).min(1).max(40),
});
export type FloorTest = z.infer<typeof FloorTest>;

export const FloorSpec = z.object({
  name: z.string().min(1).max(40),
  oneLiner: z.string().min(1).max(120),
  howToUse: z.string().min(1).max(200),
  tests: z.array(FloorTest).min(3).max(12),
});
export type FloorSpec = z.infer<typeof FloorSpec>;
