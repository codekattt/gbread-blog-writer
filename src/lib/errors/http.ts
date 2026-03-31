import { AppError } from "@/lib/errors/app-error";

type FetchJsonParams = {
  source: "youtube_metadata" | "gemini";
  url: string;
  init?: RequestInit;
  message: string;
  hint?: string;
};

function getStatusHint(source: "youtube_metadata" | "gemini", status: number) {
  if (status === 503) {
    return source === "gemini"
      ? "Gemini 서비스가 일시적으로 불안정할 수 있습니다. 잠시 후 다시 시도해보세요."
      : "YouTube 측 응답이 일시적으로 불안정하거나 차단되었을 수 있습니다. 잠시 후 다시 시도해보세요.";
  }

  if (status === 429) {
    return "요청이 너무 많아 일시적으로 제한된 상태일 수 있습니다. 잠시 후 다시 시도해보세요.";
  }

  if (status >= 500) {
    return "외부 서비스에서 일시적인 서버 오류가 발생했을 수 있습니다.";
  }

  return undefined;
}

export async function fetchTextOrThrow({
  source,
  url,
  init,
  message,
  hint,
}: FetchJsonParams) {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new AppError({
      message,
      source,
      code: "NETWORK_FETCH_FAILED",
      hint: hint || "네트워크 연결 또는 외부 서비스 접근 상태를 확인해주세요.",
      details: `GET ${url}`,
      cause: error,
    });
  }

  if (!response.ok) {
    throw new AppError({
      message,
      source,
      code: "UPSTREAM_HTTP_ERROR",
      status: response.status,
      hint: getStatusHint(source, response.status) || hint,
      details: `GET ${url}`,
    });
  }

  return response.text();
}

export async function fetchJsonOrThrow<T>({
  source,
  url,
  init,
  message,
  hint,
}: FetchJsonParams): Promise<T> {
  const text = await fetchTextOrThrow({ source, url, init, message, hint });

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new AppError({
      message: `${message} JSON 응답을 해석하지 못했습니다.`,
      source,
      code: "INVALID_JSON_RESPONSE",
      hint,
      details: `GET ${url}`,
      cause: error,
    });
  }
}
