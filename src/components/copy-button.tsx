"use client";

import { useState } from "react";

type CopyButtonProps = {
  value: string;
};

export function CopyButton({ value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-input-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:-translate-y-0.5 hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-hover)]"
    >
      {copied ? "복사됨" : "전체 복사"}
    </button>
  );
}
