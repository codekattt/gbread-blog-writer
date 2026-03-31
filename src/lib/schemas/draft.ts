import { z } from "zod";

export const draftToneSchema = z.enum(["expert", "blogger"]);
export const draftLengthSchema = z.enum(["short", "medium", "long"]);

export const draftSectionSchema = z.object({
  heading: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(2).max(4),
});

export const draftSchema = z.object({
  titleOptions: z.array(z.string().min(1)).length(3),
  openingParagraphs: z.array(z.string().min(1)).min(2).max(3),
  sections: z.array(draftSectionSchema).min(3).max(5),
  closingHeading: z.string().min(1),
  closingParagraphs: z.array(z.string().min(1)).min(1).max(3),
  summary: z.string().min(1),
  hashtags: z.array(z.string().min(1)).min(4).max(10),
  cta: z.string().min(1),
  sourceNote: z.string().min(1),
});

export const draftResponseJsonSchema = {
  type: "object",
  properties: {
    titleOptions: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
    },
    openingParagraphs: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 3,
    },
    sections: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          paragraphs: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 4,
          },
        },
        required: ["heading", "paragraphs"],
      },
    },
    closingHeading: { type: "string" },
    closingParagraphs: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3,
    },
    summary: { type: "string" },
    hashtags: {
      type: "array",
      items: { type: "string" },
      minItems: 4,
      maxItems: 10,
    },
    cta: { type: "string" },
    sourceNote: { type: "string" },
  },
  required: [
    "titleOptions",
    "openingParagraphs",
    "sections",
    "closingHeading",
    "closingParagraphs",
    "summary",
    "hashtags",
    "cta",
    "sourceNote",
  ],
};

export const writeRequestSchema = z.object({
  video: z.object({
    videoId: z.string().length(11),
    canonicalUrl: z.string().url(),
    title: z.string().min(1),
    channelName: z.string().min(1),
    description: z.string(),
    durationSeconds: z.number().int().nonnegative(),
    durationLabel: z.string().min(1),
    keywords: z.array(z.string()),
    thumbnailUrl: z.string().url().nullable(),
  }),
  analysis: z.object({
    summary: z.string().min(1),
    targetAudience: z.string().min(1),
    coreMessage: z.string().min(1),
    keyPoints: z.array(z.string().min(1)),
    recommendedOutline: z.array(z.string().min(1)),
    toneHints: z.array(z.string().min(1)),
    keywords: z.array(z.string().min(1)),
    sceneMoments: z.array(
      z.object({
        label: z.string().min(1),
        startSeconds: z.number().int().nonnegative(),
        reason: z.string().min(1),
      }),
    ),
  }),
  options: z.object({
    tone: draftToneSchema,
    length: draftLengthSchema,
    extraPrompt: z.string().max(3000).optional().default(""),
  }),
});

export type DraftToneOption = z.infer<typeof draftToneSchema>;
export type DraftLengthOption = z.infer<typeof draftLengthSchema>;
export type DraftBody = z.infer<typeof draftSchema>;
