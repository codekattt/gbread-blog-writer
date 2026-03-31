import { NextResponse } from "next/server";

import { generateStructuredContent } from "@/lib/ai/gemini";
import { buildPlainTextDraft } from "@/lib/format/plain-text";
import { buildWritePrompt } from "@/lib/prompts/write";
import { draftResponseJsonSchema, draftSchema, writeRequestSchema } from "@/lib/schemas/draft";

export async function POST(request: Request) {
  try {
    const body = writeRequestSchema.parse(await request.json());
    const draft = await generateStructuredContent({
      prompt: buildWritePrompt({
        video: body.video,
        analysis: body.analysis,
        tone: body.options.tone,
        length: body.options.length,
        extraPrompt: body.options.extraPrompt,
      }),
      schema: draftResponseJsonSchema,
      validate: (value) => draftSchema.parse(value),
      temperature: 0.5,
    });

    const selectedTitle = draft.titleOptions[0];
    const result = {
      ...draft,
      selectedTitle,
      plainText: buildPlainTextDraft({
        ...draft,
        selectedTitle,
      }),
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "블로그 초안 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
