import type { AppErrorPayload, DraftLengthOption, DraftToneOption } from "@/types";

export type ProcessingStage = "idle" | "analyzing" | "writing" | "success" | "error";

type UrlFormProps = {
  url: string;
  tone: DraftToneOption;
  length: DraftLengthOption;
  extraPrompt: string;
  isPending: boolean;
  error: string | null;
  errorDetails: AppErrorPayload | null;
  stage: ProcessingStage;
  onUrlChange: (value: string) => void;
  onToneChange: (value: DraftToneOption) => void;
  onLengthChange: (value: DraftLengthOption) => void;
  onExtraPromptChange: (value: string) => void;
  onSubmit: () => void;
};

const toneOptions: Array<{ value: DraftToneOption; label: string; description: string }> = [
  { value: "expert", label: "전문가형", description: "정돈되고 객관적인 설명형 문체" },
  { value: "blogger", label: "블로거형", description: "친근하고 가벼운 블로그 말투" },
];

const lengthOptions: Array<{ value: DraftLengthOption; label: string }> = [
  { value: "short", label: "짧게 (1,200자 이상 ~ 2,000자 미만)" },
  { value: "medium", label: "보통 (2,000자 이상 ~ 3,500자 미만)" },
  { value: "long", label: "길게 (3,500자 이상 ~ 5,500자 미만)" },
];

export function UrlForm({
  url,
  tone,
  length,
  extraPrompt,
  isPending,
  error,
  errorDetails,
  stage,
  onUrlChange,
  onToneChange,
  onLengthChange,
  onExtraPromptChange,
  onSubmit,
}: UrlFormProps) {
  const isAnalyzing = stage === "analyzing";
  const isWriting = stage === "writing";
  const analysisStatus =
    stage === "success" || stage === "writing"
      ? "done"
      : stage === "analyzing"
        ? "active"
        : stage === "error"
          ? "done"
          : "idle";
  const writingStatus =
    stage === "success"
      ? "done"
      : stage === "writing"
        ? "active"
        : stage === "error"
          ? "error"
          : "idle";
  const buttonLabel = isAnalyzing
    ? "영상 분석 중..."
    : isWriting
      ? "블로그 초안 작성 중..."
      : "분석 후 초안 만들기";
  const statusMessage = error
    ? error
    : isAnalyzing
      ? "유튜브 메타데이터와 transcript를 읽고 핵심 구조를 분석하고 있습니다."
      : isWriting
        ? "분석이 끝났고, 지금 블로그 제목과 본문 초안을 생성하고 있습니다."
        : stage === "success"
          ? "분석과 작성이 완료됐습니다. 아래 결과를 검토하고 복사하면 됩니다."
          : "분석과 작성은 순차적으로 실행됩니다.";

  return (
    <section className="section-card soft-grid overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="panel-title">Input</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            🔥 유튜브 영상 기반 블로그 초안 생성기 🔥 
          </h2>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--color-ink)]">유튜브 URL</span>
          <input
            type="url"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-[1.1rem] border border-[var(--color-line)] bg-white px-4 py-4 text-sm text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-[rgba(107,114,128,0.72)]"
          />
        </label>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-3">
            <span className="text-sm font-semibold text-[var(--color-ink)]">글 톤</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {toneOptions.map((option) => {
                const selected = option.value === tone;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onToneChange(option.value)}
                    className={`rounded-[1.25rem] border px-4 py-4 text-left ${
                      selected
                        ? "border-[rgba(194,65,12,0.28)] bg-[rgba(255,237,213,0.92)] shadow-[0_8px_24px_rgba(194,65,12,0.12)]"
                        : "border-[var(--color-line)] bg-white/90 hover:border-[rgba(194,65,12,0.22)] hover:bg-[rgba(255,247,237,0.92)]"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink)]">글 길이</span>
            <select
              value={length}
              onChange={(event) => onLengthChange(event.target.value as DraftLengthOption)}
              className="rounded-[1.1rem] border border-[var(--color-line)] bg-white px-4 py-4 text-sm text-[var(--color-ink)]"
            >
              {lengthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--color-ink)]">추가 작성 지시사항</span>
          <textarea
            value={extraPrompt}
            onChange={(event) => onExtraPromptChange(event.target.value)}
            rows={5}
            placeholder="예: 우리 브랜드 톤에 맞게 결론을 조금 더 설득형으로 정리해줘."
            className="min-h-32 w-full rounded-[1.25rem] border border-[var(--color-line)] bg-white px-4 py-4 text-sm leading-6 text-[var(--color-ink)] placeholder:text-[rgba(107,114,128,0.72)]"
          />
        </label>

        <div className="flex flex-col gap-3 border-t border-[rgba(31,41,55,0.08)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm leading-6 text-[var(--color-muted)]">
            {error ? <span className="text-[#b91c1c]">{statusMessage}</span> : statusMessage}
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="inline-flex min-w-56 items-center justify-center gap-2 rounded-full bg-[var(--color-panel-strong)] px-6 py-3 text-sm font-semibold text-[var(--color-panel-strong-ink)] hover:-translate-y-0.5 hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            ) : null}
            {buttonLabel}
          </button>
        </div>

        <div className="grid gap-3 border-t border-[rgba(31,41,55,0.08)] pt-5 lg:grid-cols-2">
          <div
            className={`rounded-[1.25rem] border px-4 py-4 ${
              analysisStatus === "active"
                ? "border-[rgba(194,65,12,0.28)] bg-[rgba(255,237,213,0.92)]"
                : analysisStatus === "done"
                  ? "border-[rgba(22,101,52,0.16)] bg-[rgba(240,253,244,0.92)]"
                  : "border-[var(--color-line)] bg-white/90"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--color-ink)]">1. 영상 분석</p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  analysisStatus === "active"
                    ? "bg-[rgba(194,65,12,0.14)] text-[var(--color-accent)]"
                    : analysisStatus === "done"
                      ? "bg-[rgba(22,101,52,0.12)] text-[var(--color-success)]"
                      : "bg-[rgba(15,23,42,0.06)] text-[var(--color-muted)]"
                }`}
              >
                {analysisStatus === "active" ? "진행 중" : analysisStatus === "done" ? "완료" : "대기"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              영상 메타데이터와 transcript를 읽고 핵심 메시지, 키포인트, 목차를 정리합니다.
            </p>
          </div>

          <div
            className={`rounded-[1.25rem] border px-4 py-4 ${
              writingStatus === "active"
                ? "border-[rgba(37,99,235,0.22)] bg-[rgba(239,246,255,0.92)]"
                : writingStatus === "done"
                  ? "border-[rgba(22,101,52,0.16)] bg-[rgba(240,253,244,0.92)]"
                  : writingStatus === "error"
                    ? "border-[rgba(185,28,28,0.18)] bg-[rgba(254,242,242,0.95)]"
                    : "border-[var(--color-line)] bg-white/90"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--color-ink)]">2. 블로그 작성</p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  writingStatus === "active"
                    ? "bg-[rgba(37,99,235,0.12)] text-[#1d4ed8]"
                    : writingStatus === "done"
                      ? "bg-[rgba(22,101,52,0.12)] text-[var(--color-success)]"
                      : writingStatus === "error"
                        ? "bg-[rgba(185,28,28,0.12)] text-[#b91c1c]"
                        : "bg-[rgba(15,23,42,0.06)] text-[var(--color-muted)]"
                }`}
              >
                {writingStatus === "active"
                  ? "작성 중"
                  : writingStatus === "done"
                    ? "완료"
                    : writingStatus === "error"
                      ? "중단"
                      : "대기"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              분석 결과를 바탕으로 제목 후보, 본문, 해시태그, 복사용 텍스트를 만듭니다.
            </p>
          </div>
        </div>

        {errorDetails ? (
          <div className="rounded-[1.25rem] border border-[rgba(185,28,28,0.18)] bg-[rgba(254,242,242,0.95)] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#991b1b]">오류 상세</p>
              <span className="rounded-full bg-[rgba(185,28,28,0.08)] px-2.5 py-1 font-mono text-xs text-[#991b1b]">
                {errorDetails.code}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-[#7f1d1d]">
              <p>
                <span className="font-semibold">실패 위치:</span> {errorDetails.source}
              </p>
              {typeof errorDetails.status === "number" ? (
                <p>
                  <span className="font-semibold">상태 코드:</span> {errorDetails.status}
                </p>
              ) : null}
              {errorDetails.hint ? (
                <p>
                  <span className="font-semibold">힌트:</span> {errorDetails.hint}
                </p>
              ) : null}
              {errorDetails.details ? (
                <p className="break-all">
                  <span className="font-semibold">세부 정보:</span> {errorDetails.details}
                </p>
              ) : null}
              {errorDetails.traceId ? (
                <p className="font-mono text-xs text-[#991b1b]">
                  trace: {errorDetails.traceId}
                </p>
              ) : null}
              <p className="text-xs text-[#991b1b]">
                개발 서버 터미널에서 같은 trace id로 서버 로그를 확인할 수 있습니다.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
