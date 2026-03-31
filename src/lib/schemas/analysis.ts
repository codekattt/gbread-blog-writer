import { z } from "zod";

export const sceneMomentSchema = z.object({
  label: z.string().min(1),
  startSeconds: z.number().int().nonnegative(),
  reason: z.string().min(1),
});

export const analysisSchema = z.object({
  summary: z.string().min(1),
  targetAudience: z.string().min(1),
  coreMessage: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(3).max(7),
  recommendedOutline: z.array(z.string().min(1)).min(3).max(7),
  toneHints: z.array(z.string().min(1)).min(2).max(5),
  keywords: z.array(z.string().min(1)).min(4).max(12),
  sceneMoments: z.array(sceneMomentSchema).min(2).max(5),
});

export const analysisResponseJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    targetAudience: { type: "string" },
    coreMessage: { type: "string" },
    keyPoints: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 7,
    },
    recommendedOutline: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 7,
    },
    toneHints: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 5,
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      minItems: 4,
      maxItems: 12,
    },
    sceneMoments: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          startSeconds: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["label", "startSeconds", "reason"],
      },
    },
  },
  required: [
    "summary",
    "targetAudience",
    "coreMessage",
    "keyPoints",
    "recommendedOutline",
    "toneHints",
    "keywords",
    "sceneMoments",
  ],
};

export type Analysis = z.infer<typeof analysisSchema>;
