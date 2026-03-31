import { NextResponse } from "next/server";
import { z } from "zod";

import { generateStructuredContent } from "@/lib/ai/gemini";
import { formatErrorForLog, toErrorPayload } from "@/lib/errors/app-error";
import { buildAnalyzePrompt } from "@/lib/prompts/analyze";
import { analysisResponseJsonSchema, analysisSchema } from "@/lib/schemas/analysis";
import { fetchYoutubeMetadata } from "@/lib/youtube/metadata";
import { normalizeYoutubeInput } from "@/lib/youtube/normalize";
import { fetchYoutubeTranscript } from "@/lib/youtube/transcript";

const analyzeRequestSchema = z.object({
  url: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = analyzeRequestSchema.parse(await request.json());
    const normalized = normalizeYoutubeInput(body.url);
    const [video, transcript] = await Promise.all([
      fetchYoutubeMetadata(normalized.videoId, normalized.canonicalUrl),
      fetchYoutubeTranscript(normalized.canonicalUrl),
    ]);

    const analysis = await generateStructuredContent({
      prompt: buildAnalyzePrompt({
        video,
        transcript: transcript.promptText,
      }),
      schema: analysisResponseJsonSchema,
      validate: (value) => analysisSchema.parse(value),
      temperature: 0.3,
    });

    return NextResponse.json({
      video,
      analysis,
      transcript: {
        languageCode: transcript.languageCode,
        characterCount: transcript.text.length,
      },
    });
  } catch (error) {
    const traceId = crypto.randomUUID();
    const payload =
      error instanceof z.ZodError
        ? {
            error: "요청 형식이 올바르지 않습니다.",
            source: "api" as const,
            code: "INVALID_ANALYZE_REQUEST",
            status: 400,
            hint: "유튜브 링크가 비어 있지 않은지 확인해주세요.",
            traceId,
          }
        : toErrorPayload(error, traceId, {
            message: "영상 분석 중 오류가 발생했습니다.",
            source: "api",
            code: "ANALYZE_FAILED",
          });

    console.error("[api/analyze]", {
      traceId,
      route: "/api/analyze",
      error: formatErrorForLog(error),
    });

    return NextResponse.json(payload, { status: payload.status || 400 });
  }
}
