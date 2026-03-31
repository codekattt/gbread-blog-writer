import { CopyButton } from "@/components/copy-button";
import type { DraftResult } from "@/types";

type DraftPanelProps = {
  draft: DraftResult | null;
};

export function DraftPanel({ draft }: DraftPanelProps) {
  if (!draft) {
    return (
      <section className="section-card p-5 sm:p-6">
        <p className="panel-title">Draft</p>
        <div className="mt-4 rounded-[1.5rem] border border-dashed border-[var(--color-line)] bg-white/60 p-6 text-sm leading-6 text-[var(--color-muted)]">
          생성된 블로그 초안이 아직 없습니다. 분석이 끝나면 제목 후보, 본문 구조,
          해시태그와 함께 plain text 결과가 이곳에 표시됩니다.
        </div>
      </section>
    );
  }

  return (
    <section className="section-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="panel-title">Draft</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            복붙용 블로그 초안
          </h2>
        </div>
        <CopyButton value={draft.plainText} />
      </div>

      <article className="mt-6 rounded-[1.75rem] border border-[var(--color-line)] bg-white p-5 shadow-[0_18px_36px_rgba(120,53,15,0.06)] sm:p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Selected Title</p>
        <h3 className="mt-3 text-2xl font-semibold leading-9 text-[var(--color-ink)]">
          {draft.selectedTitle}
        </h3>
        <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">{draft.openingParagraph}</p>
      </article>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Title Options</p>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-ink)]">
            {draft.titleOptions.map((title, index) => (
              <li key={title} className="rounded-[1rem] bg-[rgba(255,247,237,0.84)] px-4 py-3">
                {index + 1}. {title}
              </li>
            ))}
          </ol>
        </article>

        <div className="grid gap-4">
          <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Summary</p>
            <p className="mt-4 text-sm leading-7 text-[var(--color-ink)]">{draft.summary}</p>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Hashtags</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {draft.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[rgba(22,101,52,0.14)] bg-[rgba(240,253,244,0.88)] px-3 py-1 text-xs font-medium text-[var(--color-success)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        </div>
      </div>

      <article className="mt-4 rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Content Preview</p>
        <div className="mt-4 space-y-4">
          {draft.sections.map((section, index) => (
            <div
              key={section.heading}
              className="rounded-[1.25rem] border border-[var(--color-line)] bg-[rgba(248,250,252,0.78)] p-4 sm:p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-lg font-semibold text-[var(--color-ink)]">{section.heading}</h4>
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Section {index + 1}
                </span>
              </div>
              <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--color-muted)]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="mt-4 rounded-[1.5rem] border border-[var(--color-line)] bg-[rgba(255,247,237,0.72)] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Closing</p>
        <p className="mt-3 text-sm leading-7 text-[var(--color-ink)]">{draft.closingParagraph}</p>
        <p className="mt-4 text-sm font-semibold text-[var(--color-accent)]">{draft.cta}</p>
      </article>

      <div className="mt-4 rounded-[1.5rem] border border-[var(--color-line)] bg-[rgba(15,23,42,0.96)] p-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/65">Plain Text Output</p>
            <p className="mt-1 text-sm leading-6 text-white/70">
              게시판에 바로 붙여넣기 쉬운 최종 문자열입니다.
            </p>
          </div>
          <CopyButton value={draft.plainText} />
        </div>
        <textarea
          readOnly
          value={draft.plainText}
          className="mt-4 min-h-80 w-full rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 font-mono text-xs leading-6 text-white"
        />
      </div>
    </section>
  );
}
