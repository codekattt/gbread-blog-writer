import { NextResponse } from "next/server";

import { generateStructuredContent } from "@/lib/ai/gemini";
import { formatErrorForLog, toErrorPayload } from "@/lib/errors/app-error";
import { buildPlainTextDraft } from "@/lib/format/plain-text";
import { buildWritePrompt } from "@/lib/prompts/write";
import { draftResponseJsonSchema, draftSchema, writeRequestSchema } from "@/lib/schemas/draft";

function buildSourceNote(video: { channelName: string; canonicalUrl: string }) {
  return `본 포스팅은 유튜브 채널 '${video.channelName}'의 영상을 바탕으로 작성되었습니다. 원본 영상: ${video.canonicalUrl}`;
}

export async function POST(request: Request) {
  try {
    const body = writeRequestSchema.parse(await request.json());
    const { data: draft, modelUsed } = await generateStructuredContent({
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
    const sourceNote = buildSourceNote(body.video);
    const result = {
      ...draft,
      sourceNote,
      selectedTitle,
      plainText: buildPlainTextDraft({
        ...draft,
        sourceNote,
        selectedTitle,
      }),
      modelUsed,
    };

    return NextResponse.json(result);
  } catch (error) {
    const traceId = crypto.randomUUID();
    const payload = toErrorPayload(error, traceId, {
      message: "블로그 초안 생성 중 오류가 발생했습니다.",
      source: "api",
      code: "WRITE_FAILED",
    });

    console.error("[api/write]", {
      traceId,
      route: "/api/write",
      error: formatErrorForLog(error),
    });

    return NextResponse.json(payload, { status: payload.status || 400 });
  }
}
