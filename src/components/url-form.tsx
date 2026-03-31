import type { DraftLengthOption, DraftToneOption } from "@/types";

type UrlFormProps = {
  url: string;
  tone: DraftToneOption;
  length: DraftLengthOption;
  extraPrompt: string;
  isPending: boolean;
  error: string | null;
  onUrlChange: (value: string) => void;
  onToneChange: (value: DraftToneOption) => void;
  onLengthChange: (value: DraftLengthOption) => void;
  onExtraPromptChange: (value: string) => void;
  onSubmit: () => void;
};

const toneOptions: Array<{ value: DraftToneOption; label: string; description: string }> = [
  { value: "professional", label: "전문형", description: "정돈되고 신뢰감 있는 설명형" },
  { value: "friendly", label: "친근형", description: "부드럽고 읽기 쉬운 블로그 톤" },
  { value: "insightful", label: "인사이트형", description: "포인트를 또렷하게 짚는 해설형" },
];

const lengthOptions: Array<{ value: DraftLengthOption; label: string }> = [
  { value: "short", label: "짧게" },
  { value: "medium", label: "보통" },
  { value: "long", label: "길게" },
];

export function UrlForm({
  url,
  tone,
  length,
  extraPrompt,
  isPending,
  error,
  onUrlChange,
  onToneChange,
  onLengthChange,
  onExtraPromptChange,
  onSubmit,
}: UrlFormProps) {
  return (
    <section className="section-card soft-grid overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="panel-title">Input</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            유튜브 링크와 작성 조건
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-[var(--color-muted)]">
          공개 transcript가 있는 영상 기준으로 가장 안정적으로 동작합니다.
        </p>
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
            <div className="grid gap-3 sm:grid-cols-3">
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
            {error ? <span className="text-[#b91c1c]">{error}</span> : "분석과 작성은 순차적으로 실행됩니다."}
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-panel-strong)] px-6 py-3 text-sm font-semibold text-[var(--color-panel-strong-ink)] hover:-translate-y-0.5 hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "분석 및 작성 중..." : "분석 후 초안 만들기"}
          </button>
        </div>
      </div>
    </section>
  );
}
