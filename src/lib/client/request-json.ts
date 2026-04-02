import type { AppErrorPayload } from "@/types";

export class RequestError extends Error {
  payload: AppErrorPayload;

  constructor(payload: AppErrorPayload) {
    super(payload.error);
    this.name = "RequestError";
    this.payload = payload;
  }
}

export async function requestJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? ((await response.json()) as T | AppErrorPayload)
    : ({
        error: await response.text(),
        source: "client",
        code: "NON_JSON_RESPONSE",
      } satisfies AppErrorPayload);

  if (!response.ok) {
    if (typeof data === "object" && data && "error" in data) {
      throw new RequestError(data);
    }

    throw new RequestError({
      error: "요청 처리 중 오류가 발생했습니다.",
      source: "client",
      code: "UNKNOWN_REQUEST_ERROR",
      status: response.status,
    });
  }

  return data as T;
}
