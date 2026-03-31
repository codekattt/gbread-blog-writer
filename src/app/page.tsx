import { WriterWorkspace } from "@/components/writer-workspace";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(254,243,199,0.92),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(191,219,254,0.68),_transparent_30%),linear-gradient(180deg,_#fffaf1_0%,_#fff7ed_48%,_#fffdf8_100%)] px-5 py-8 text-[var(--color-ink)] sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(90deg,rgba(190,24,93,0.08),rgba(217,119,6,0.06),rgba(37,99,235,0.06))]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="grid gap-6 rounded-[2rem] border border-[var(--color-line)] bg-[rgba(255,251,245,0.9)] p-6 shadow-[0_20px_60px_rgba(120,53,15,0.08)] backdrop-blur sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-[rgba(120,53,15,0.15)] bg-[rgba(255,255,255,0.72)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Internal Workflow
            </span>
            <div className="space-y-3">
              <h1 className="max-w-3xl font-display text-4xl leading-[1.05] tracking-tight text-[var(--color-ink)] sm:text-5xl lg:text-6xl">
                유튜브를 블로그 초안으로 바로 변환하는 작업대
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                링크 하나로 영상 텍스트를 정리하고, Gemini가 핵심 구조를 분석한 뒤,
                블로그 게시판에 바로 붙여넣기 쉬운 한국어 초안을 생성합니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  01 Analyze
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]">
                  영상 메타데이터와 transcript를 먼저 구조화합니다.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  02 Write
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]">
                  분석 결과를 바탕으로 제목, 본문, 해시태그를 작성합니다.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  03 Copy
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]">
                  결과를 plain text로 복사해 게시판에 바로 붙여넣습니다.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,247,237,0.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              First Version
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-ink)]">
              <li>유튜브 링크 정규화 및 검증</li>
              <li>공개 transcript 기반 내용 분석</li>
              <li>Gemini structured output으로 결과 제어</li>
              <li>복사하기 쉬운 plain text 포맷 생성</li>
              <li>추후 캡쳐용 타임코드 후보까지 함께 추출</li>
            </ul>
            <div className="mt-6 rounded-[1.25rem] bg-[var(--color-panel-strong)] p-4 text-sm leading-6 text-[var(--color-panel-strong-ink)]">
              환경 변수에는 <code className="font-mono text-xs">GEMINI_API_KEY</code>만
              우선 넣으면 됩니다. transcript가 없는 영상은 현재 버전에서 실패 처리됩니다.
            </div>
          </aside>
        </section>

        <WriterWorkspace />
      </div>
    </main>
  );
}
