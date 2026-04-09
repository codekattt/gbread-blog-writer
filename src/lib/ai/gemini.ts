import { GoogleGenAI } from "@google/genai";

import { AppError } from "@/lib/errors/app-error";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const MODEL_FALLBACK_CHAIN: string[] = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

function buildFallbackChain(startModel: string): string[] {
  const startIndex = MODEL_FALLBACK_CHAIN.indexOf(startModel);
  const chain = startIndex === -1
    ? [startModel, ...MODEL_FALLBACK_CHAIN]
    : MODEL_FALLBACK_CHAIN.slice(startIndex);
  return chain.slice(0, 3);
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
  }

  return new GoogleGenAI({ apiKey });
}

type GenerateStructuredContentParams<T> = {
  prompt?: string;
  contents?: unknown;
  schema: unknown;
  validate: (value: unknown) => T;
  temperature?: number;
  model?: string;
};

type GenerateStructuredContentResult<T> = {
  data: T;
  modelUsed: string;
};

function isRetryableStatus(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: number }).status;
    return status === 503 || status === 429;
  }
  return false;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateStructuredContent<T>({
  prompt,
  contents,
  schema,
  validate,
  temperature = 0.4,
  model = DEFAULT_MODEL,
}: GenerateStructuredContentParams<T>): Promise<GenerateStructuredContentResult<T>> {
  const client = getClient();
  const requestContents = contents ?? prompt;

  if (!requestContents) {
    throw new AppError({
      message: "Gemini에 전달할 입력이 비어 있습니다.",
      source: "gemini",
      code: "EMPTY_GEMINI_INPUT",
      details: `model=${model}`,
    });
  }

  const chain = buildFallbackChain(model);
  let lastError: unknown;

  for (let attempt = 0; attempt < chain.length; attempt++) {
    const currentModel = chain[attempt];

    try {
      if (attempt > 0) {
        await delay(600);
      }

      const response = await client.models.generateContent({
        model: currentModel,
        contents: requestContents,
        config: {
          temperature,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      });

      if (!response.text) {
        throw new AppError({
          message: "Gemini 응답이 비어 있습니다.",
          source: "gemini",
          code: "EMPTY_GEMINI_RESPONSE",
          details: `model=${currentModel}`,
        });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(response.text) as unknown;
      } catch (parseError) {
        throw new AppError({
          message: "Gemini JSON 응답을 해석하지 못했습니다.",
          source: "gemini",
          code: "INVALID_GEMINI_JSON",
          details: `model=${currentModel}`,
          cause: parseError,
        });
      }

      return {
        data: validate(parsed),
        modelUsed: currentModel,
      };
    } catch (error) {
      lastError = error;
      const retryable = isRetryableStatus(error);
      const hasNext = attempt < chain.length - 1;

      if (retryable && hasNext) {
        console.warn(`[gemini] ${currentModel} 503/429 → ${chain[attempt + 1]} 로 전환 (시도 ${attempt + 1}/${chain.length})`);
        continue;
      }

      break;
    }
  }

  const finalError = lastError;
  const status =
    typeof finalError === "object" && finalError !== null && "status" in finalError
      ? (finalError as { status?: number }).status
      : undefined;

  throw new AppError({
    message: "Gemini 호출 중 오류가 발생했습니다.",
    source: "gemini",
    code: status ? "GEMINI_HTTP_ERROR" : "GEMINI_REQUEST_FAILED",
    status,
    hint:
      status === 503
        ? `모든 모델(${chain.join(" → ")})에서 503 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`
        : status === 429
          ? "Gemini 요청이 일시적으로 제한됐습니다. 잠시 후 다시 시도해보세요."
          : "API 키, 모델명, 네트워크 상태를 확인해주세요.",
    details: `chain=${chain.join(" → ")}`,
    cause: finalError,
  });
}
