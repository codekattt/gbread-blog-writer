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
          생성된 블로그 초안이 아직 없습니다. 분석이 끝나면 복붙하기 쉬운 게시글 초안,
          제목 후보, 해시태그가 이곳에 표시됩니다.
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
            블로그 초안
          </h2>
        </div>
        <CopyButton value={draft.plainText} />
      </div>

      <article className="mt-6 rounded-[1.75rem] border border-[var(--color-line)] bg-white p-5 shadow-[0_18px_36px_rgba(120,53,15,0.06)] sm:p-7">
        <div className="flex flex-col gap-3 border-b border-[rgba(31,41,55,0.08)] pb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Post Draft</p>
          <h3 className="text-[2rem] font-semibold leading-[1.3] tracking-tight text-[var(--color-ink)] sm:text-[2.25rem]">
            {draft.selectedTitle}
          </h3>
        </div>

        <div className="mt-8 space-y-8">
          {draft.openingParagraphs.map((paragraph) => (
            <p key={paragraph} className="text-[1rem] leading-8 text-[var(--color-ink)] sm:text-[1.05rem]">
              {paragraph}
            </p>
          ))}

          {draft.sections.map((section) => (
            <section key={section.heading} className="space-y-4">
              <h4 className="text-[1.35rem] font-semibold leading-9 tracking-tight text-[var(--color-ink)]">
                {section.heading}
              </h4>
              <div className="space-y-4 text-[1rem] leading-8 text-[var(--color-ink)]/88">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section className="space-y-4 border-t border-[rgba(31,41,55,0.08)] pt-6">
            <h4 className="text-[1.2rem] font-semibold leading-8 text-[var(--color-ink)]">
              {draft.closingHeading}
            </h4>
            <div className="space-y-4 text-[1rem] leading-8 text-[var(--color-ink)]/88">
              {draft.closingParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <p className="text-[1rem] font-semibold leading-8 text-[var(--color-accent)]">{draft.cta}</p>
            <p className="break-words text-[0.98rem] leading-7 text-[var(--color-muted)]">{draft.sourceNote}</p>
          </section>
        </div>
      </article>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
        <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Title Options</p>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-ink)]">
            {draft.titleOptions.map((title, index) => (
              <li key={title} className="rounded-[1rem] bg-[rgba(255,247,237,0.84)] px-4 py-3">
                {index + 1}. {title}
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Hashtags</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {draft.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[rgba(22,101,52,0.14)] bg-[rgba(240,253,244,0.88)] px-3 py-1.5 text-xs font-medium text-[var(--color-success)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
