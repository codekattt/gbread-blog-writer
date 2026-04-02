export type ErrorSource =
  | "api"
  | "client"
  | "youtube_metadata"
  | "youtube_transcript"
  | "youtube_capture"
  | "gemini"
  | "unknown";

export type AppErrorPayload = {
  error: string;
  source: ErrorSource;
  code: string;
  status?: number;
  hint?: string;
  details?: string;
  traceId?: string;
};

type AppErrorParams = {
  message: string;
  source: ErrorSource;
  code: string;
  status?: number;
  hint?: string;
  details?: string;
  cause?: unknown;
};

export class AppError extends Error {
  source: ErrorSource;
  code: string;
  status?: number;
  hint?: string;
  details?: string;
  override cause?: unknown;

  constructor({ message, source, code, status, hint, details, cause }: AppErrorParams) {
    super(message);
    this.name = "AppError";
    this.source = source;
    this.code = code;
    this.status = status;
    this.hint = hint;
    this.details = details;
    this.cause = cause;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getErrorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }

  return undefined;
}

export function normalizeError(
  error: unknown,
  fallback: Pick<AppErrorParams, "message" | "source" | "code">,
) {
  if (error instanceof AppError) {
    return error;
  }

  const message = getErrorMessage(error);
  const status = getErrorStatus(error);

  return new AppError({
    message: message || fallback.message,
    source: fallback.source,
    code: fallback.code,
    status,
    cause: error,
  });
}

export function toErrorPayload(error: unknown, traceId: string, fallback: AppErrorParams): AppErrorPayload {
  const normalized = normalizeError(error, fallback);

  return {
    error: normalized.message,
    source: normalized.source,
    code: normalized.code,
    status: normalized.status,
    hint: normalized.hint,
    details: normalized.details,
    traceId,
  };
}

export function formatErrorForLog(error: unknown) {
  const normalized = error instanceof AppError ? error : normalizeError(error, {
    message: "알 수 없는 오류가 발생했습니다.",
    source: "unknown",
    code: "UNKNOWN_ERROR",
  });

  return {
    name: normalized.name,
    message: normalized.message,
    source: normalized.source,
    code: normalized.code,
    status: normalized.status,
    hint: normalized.hint,
    details: normalized.details,
    cause: normalized.cause instanceof Error ? normalized.cause.message : normalized.cause,
    stack: normalized.stack,
  };
}
