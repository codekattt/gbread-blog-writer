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
    draft.openingParagraph,
    "",
    sectionText,
    "",
    draft.closingParagraph,
    "",
    draft.cta,
    "",
    draft.hashtags.join(" "),
  ].join("\n");
}
