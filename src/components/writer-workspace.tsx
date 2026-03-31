"use client";

import { useState, useTransition } from "react";

import { AnalysisPanel } from "@/components/analysis-panel";
import { DraftPanel } from "@/components/draft-panel";
import { UrlForm } from "@/components/url-form";
import type {
  AnalyzeResponse,
  DraftLengthOption,
  DraftToneOption,
  DraftWriteResponse,
} from "@/types";

async function requestJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data ? data.error : null;
    throw new Error(message || "요청 처리 중 오류가 발생했습니다.");
  }

  return data as T;
}

export function WriterWorkspace() {
  const [url, setUrl] = useState("");
  const [tone, setTone] = useState<DraftToneOption>("professional");
  const [length, setLength] = useState<DraftLengthOption>("medium");
  const [extraPrompt, setExtraPrompt] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [draftResult, setDraftResult] = useState<DraftWriteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        setError(null);
        setDraftResult(null);

        const analysis = await requestJson<AnalyzeResponse>("/api/analyze", { url });
        setAnalysisResult(analysis);

        const draft = await requestJson<DraftWriteResponse>("/api/write", {
          video: analysis.video,
          analysis: analysis.analysis,
          options: {
            tone,
            length,
            extraPrompt,
          },
        });

        setDraftResult(draft);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "초안 생성 중 예상치 못한 오류가 발생했습니다.",
        );
      }
    });
  };

  return (
    <div className="grid gap-6">
      <UrlForm
        url={url}
        tone={tone}
        length={length}
        extraPrompt={extraPrompt}
        isPending={isPending}
        error={error}
        onUrlChange={setUrl}
        onToneChange={setTone}
        onLengthChange={setLength}
        onExtraPromptChange={setExtraPrompt}
        onSubmit={handleSubmit}
      />

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <AnalysisPanel analysis={analysisResult} />
        <DraftPanel draft={draftResult} />
      </div>
    </div>
  );
}
