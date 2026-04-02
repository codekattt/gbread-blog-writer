import { z } from "zod";

import { sceneMomentSchema } from "@/lib/schemas/analysis";

export const captureRequestSchema = z.object({
  video: z.object({
    videoId: z.string().length(11),
    canonicalUrl: z.string().url(),
    title: z.string().min(1),
    durationSeconds: z.number().int().nonnegative(),
  }),
  analysis: z.object({
    sceneMoments: z.array(sceneMomentSchema).min(2).max(12),
  }),
  options: z.object({
    count: z.number().int().min(4).max(12).default(8),
    avoidIntroOutro: z.boolean().default(true),
  }),
});

export const captureItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  reason: z.string().min(1),
  timestampSeconds: z.number().int().nonnegative(),
  timestampLabel: z.string().min(1),
  filename: z.string().min(1),
  dataUrl: z.string().startsWith("data:image/jpeg;base64,"),
});

export const captureResponseSchema = z.object({
  source: z.literal("scene_moments"),
  captures: z.array(captureItemSchema).min(1).max(12),
});

export type CaptureRequest = z.infer<typeof captureRequestSchema>;
export type CaptureResponse = z.infer<typeof captureResponseSchema>;
export type CaptureItem = z.infer<typeof captureItemSchema>;
