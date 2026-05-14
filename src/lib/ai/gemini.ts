import { GoogleGenAI } from "@google/genai";

import { AppError } from "@/lib/errors/app-error";

const DEFAULT_MODEL_FALLBACK_CHAIN: string[] = [
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
];

const RETRIES_PER_MODEL = 2;

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

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    return (error as { status?: number }).status;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message);
  }

  return String(error);
}

// 503: 같은 모델 재시도. 429는 quota 문제일 가능성이 높아 다음 모델로 넘긴다.
function shouldRetry(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 503;
}

// 404: 모델 자체가 없는 것 → 다음 모델로 넘어감 (재시도 없이)
function shouldSkipModel(error: unknown): boolean {
  return getErrorStatus(error) === 404;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModelFallbackChain(preferredModel?: string) {
  const chain = preferredModel
    ? [preferredModel, ...DEFAULT_MODEL_FALLBACK_CHAIN]
    : DEFAULT_MODEL_FALLBACK_CHAIN;

  return [...new Set(chain.map((model) => model.trim()).filter(Boolean))];
}

type ModelFailure = {
  model: string;
  retry: number;
  status?: number;
  message: string;
};

export async function generateStructuredContent<T>({
  prompt,
  contents,
  schema,
  validate,
  temperature = 0.4,
  model,
}: GenerateStructuredContentParams<T>): Promise<GenerateStructuredContentResult<T>> {
  const client = getClient();
  const requestContents = contents ?? prompt;
  const modelFallbackChain = getModelFallbackChain(model);

  if (!requestContents) {
    throw new AppError({
      message: "Gemini에 전달할 입력이 비어 있습니다.",
      source: "gemini",
      code: "EMPTY_GEMINI_INPUT",
    });
  }

  let lastError: unknown;
  const failures: ModelFailure[] = [];

  for (let modelIndex = 0; modelIndex < modelFallbackChain.length; modelIndex++) {
    const currentModel = modelFallbackChain[modelIndex];

    let skipModel = false;

    for (let retry = 0; retry < RETRIES_PER_MODEL; retry++) {
      if (modelIndex > 0 || retry > 0) {
        await delay(700);
      }

      try {
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
        failures.push({
          model: currentModel,
          retry: retry + 1,
          status: getErrorStatus(error),
          message: getErrorMessage(error),
        });

        if (shouldSkipModel(error)) {
          console.warn(`[gemini] ${currentModel} 404 (모델 없음) → 다음 모델로 전환`);
          skipModel = true;
          break;
        }

        if (!shouldRetry(error)) {
          console.warn(`[gemini] ${currentModel} ${getErrorStatus(error) ?? "unknown"} → 다음 모델로 전환`, {
            message: getErrorMessage(error),
          });
          break;
        }

        const isLastRetry = retry === RETRIES_PER_MODEL - 1;
        const isLastModel = modelIndex === modelFallbackChain.length - 1;

        if (!isLastRetry) {
          console.warn(`[gemini] ${currentModel} 503/429 → 재시도 (${retry + 1}/${RETRIES_PER_MODEL})`);
        } else if (!isLastModel) {
          console.warn(`[gemini] ${currentModel} 503/429 (${RETRIES_PER_MODEL}회) → ${modelFallbackChain[modelIndex + 1]} 로 전환`);
        }
      }
    }

    if (!skipModel && !shouldRetry(lastError)) {
      continue;
    }
  }

  const status = getErrorStatus(lastError);
  console.error("[gemini] 모든 모델 호출 실패", {
    chain: modelFallbackChain,
    failures,
  });

  throw new AppError({
    message: "Gemini 호출 중 오류가 발생했습니다.",
    source: "gemini",
    code: status ? "GEMINI_HTTP_ERROR" : "GEMINI_REQUEST_FAILED",
    status,
    hint:
      status === 503
        ? `모든 모델(${modelFallbackChain.join(" → ")})에서 503 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`
        : status === 429
          ? "Gemini 요청이 일시적으로 제한됐습니다. 잠시 후 다시 시도해보세요."
          : "API 키, 네트워크 상태를 확인해주세요.",
    details: JSON.stringify({
      chain: modelFallbackChain,
      failures,
    }),
    cause: lastError,
  });
}
