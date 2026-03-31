import type { AnalyzeResponse } from "@/types";

type AnalysisPanelProps = {
  analysis: AnalyzeResponse | null;
};

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  if (!analysis) {
    return (
      <section className="section-card p-5 sm:p-6">
        <p className="panel-title">Analysis</p>
        <div className="mt-4 rounded-[1.5rem] border border-dashed border-[var(--color-line)] bg-white/60 p-6 text-sm leading-6 text-[var(--color-muted)]">
          분석 결과가 아직 없습니다. 유튜브 링크를 입력하고 실행하면 이 영역에 영상
          요약만 간단하게 표시됩니다.
        </div>
      </section>
    );
  }

  return (
    <section className="section-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="panel-title">Analysis</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            영상 분석 결과
          </h2>
        </div>
        <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
          {analysis.video.channelName}
        </span>
      </div>

      <article className="mt-6 rounded-[1.75rem] border border-[var(--color-line)] bg-white p-5 shadow-[0_18px_36px_rgba(120,53,15,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Video Summary</p>
            <h3 className="mt-3 text-2xl font-semibold leading-9 text-[var(--color-ink)]">
              {analysis.video.title}
            </h3>
            <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
              {analysis.analysis.summary}
            </p>
          </div>
          <div className="grid gap-3 rounded-[1.25rem] bg-[rgba(255,247,237,0.68)] p-4 text-sm text-[var(--color-ink)] lg:min-w-64">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Length</p>
              <p className="mt-1 font-semibold">{analysis.video.durationLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Channel</p>
              <p className="mt-1 font-semibold">{analysis.video.channelName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Input Mode</p>
              <p className="mt-1 font-semibold">
                {analysis.transcript.mode === "transcript" ? "Transcript 분석" : "Gemini 영상 직접 분석"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Input Status</p>
              <p className="mt-1 font-semibold">
                {analysis.transcript.languageCode
                  ? `${analysis.transcript.languageCode} / ${analysis.transcript.characterCount.toLocaleString()} chars`
                  : "자막 없이 영상 직접 분석"}
              </p>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
