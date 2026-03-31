import { GoogleGenAI } from "@google/genai";

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
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  });

  if (!response.text) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }

  const parsed = JSON.parse(response.text) as unknown;
  return validate(parsed);
}
