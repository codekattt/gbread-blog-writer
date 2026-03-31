import type { AnalyzeResponse } from "@/types";

type AnalysisPanelProps = {
  analysis: AnalyzeResponse | null;
};

function formatTimestamp(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  if (!analysis) {
    return (
      <section className="section-card p-5 sm:p-6">
        <p className="panel-title">Analysis</p>
        <div className="mt-4 rounded-[1.5rem] border border-dashed border-[var(--color-line)] bg-white/60 p-6 text-sm leading-6 text-[var(--color-muted)]">
          분석 결과가 아직 없습니다. 유튜브 링크를 입력하고 실행하면 이 영역에 영상 구조,
          핵심 포인트, 추천 목차가 표시됩니다.
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
            영상 구조와 글감 정리
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
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Transcript Ready</p>
              <p className="mt-1 font-semibold">
                {analysis.transcript.languageCode
                  ? `${analysis.transcript.languageCode} / ${analysis.transcript.characterCount.toLocaleString()} chars`
                  : "자막 없이 영상 직접 분석"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-[1.25rem] bg-[rgba(255,247,237,0.8)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Core Message
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]">{analysis.analysis.coreMessage}</p>
          </div>
          <div className="rounded-[1.25rem] bg-[rgba(239,246,255,0.84)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Target Audience
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]">
              {analysis.analysis.targetAudience}
            </p>
          </div>
        </div>
      </article>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Key Points</p>
          <ul className="mt-4 grid gap-3">
            {analysis.analysis.keyPoints.map((point, index) => (
              <li key={point} className="rounded-[1rem] bg-[rgba(248,250,252,0.94)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Point {index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]">{point}</p>
              </li>
            ))}
          </ul>
        </article>

        <div className="grid gap-4">
          <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Keywords</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.analysis.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-[var(--color-line)] bg-[rgba(255,247,237,0.8)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)]"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Tone Hints</p>
            <div className="mt-4 grid gap-2">
              {analysis.analysis.toneHints.map((hint) => (
                <div
                  key={hint}
                  className="rounded-[1rem] border border-[var(--color-line)] bg-[rgba(255,255,255,0.86)] px-4 py-3 text-sm leading-6 text-[var(--color-ink)]"
                >
                  {hint}
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Recommended Outline</p>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-ink)]">
            {analysis.analysis.recommendedOutline.map((item, index) => (
              <li key={item} className="flex gap-3 rounded-[1rem] bg-[rgba(248,250,252,0.76)] px-4 py-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(15,23,42,0.92)] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Capture Ready</p>
          <div className="mt-4 grid gap-3">
            {analysis.analysis.sceneMoments.map((scene) => (
              <div
                key={`${scene.startSeconds}-${scene.label}`}
                className="rounded-[1.2rem] border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{scene.label}</p>
                  <span className="rounded-full bg-[rgba(15,23,42,0.08)] px-2.5 py-1 font-mono text-xs text-[var(--color-ink)]">
                    {formatTimestamp(scene.startSeconds)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{scene.reason}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
