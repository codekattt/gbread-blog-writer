import type { DraftBody } from "@/lib/schemas/draft";

type PlainTextDraftInput = DraftBody & {
  selectedTitle: string;
};

export function buildPlainTextDraft(draft: PlainTextDraftInput) {
  const sectionText = draft.sections
    .map((section) => `${section.heading}\n\n${section.paragraphs.join("\n\n")}`)
    .join("\n\n");

  return [
    draft.selectedTitle,
    "",
    draft.openingParagraphs.join("\n\n"),
    "",
    sectionText,
    "",
    draft.closingHeading,
    "",
    draft.closingParagraphs.join("\n\n"),
    "",
    draft.cta,
    "",
    draft.sourceNote,
    "",
    draft.hashtags.join(" "),
  ].join("\n");
}
