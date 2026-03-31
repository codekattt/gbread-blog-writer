import { GoogleGenAI } from "@google/genai";

import { AppError } from "@/lib/errors/app-error";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
  }

  return new GoogleGenAI({ apiKey });
}

type GenerateStructuredContentParams<T> = {
  prompt: string;
  schema: unknown;
  validate: (value: unknown) => T;
  temperature?: number;
  model?: string;
};

export async function generateStructuredContent<T>({
  prompt,
  schema,
  validate,
  temperature = 0.4,
  model = DEFAULT_MODEL,
}: GenerateStructuredContentParams<T>): Promise<T> {
  const client = getClient();

  let response: Awaited<ReturnType<typeof client.models.generateContent>>;
  try {
    response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status?: number }).status
        : undefined;

    throw new AppError({
      message: "Gemini 호출 중 오류가 발생했습니다.",
      source: "gemini",
      code: status ? "GEMINI_HTTP_ERROR" : "GEMINI_REQUEST_FAILED",
      status,
      hint:
        status === 503
          ? "Gemini 서비스가 일시적으로 불안정할 수 있습니다. 잠시 후 다시 시도해보세요."
          : status === 429
            ? "Gemini 요청이 일시적으로 제한됐을 수 있습니다. 잠시 후 다시 시도해보세요."
            : "API 키, 모델명, 네트워크 상태를 확인해주세요.",
      details: `model=${model}`,
      cause: error,
    });
  }

  if (!response.text) {
    throw new AppError({
      message: "Gemini 응답이 비어 있습니다.",
      source: "gemini",
      code: "EMPTY_GEMINI_RESPONSE",
      details: `model=${model}`,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text) as unknown;
  } catch (error) {
    throw new AppError({
      message: "Gemini JSON 응답을 해석하지 못했습니다.",
      source: "gemini",
      code: "INVALID_GEMINI_JSON",
      details: `model=${model}`,
      cause: error,
    });
  }

  return validate(parsed);
}
