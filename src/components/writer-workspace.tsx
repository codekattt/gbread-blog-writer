"use client";

import { useState } from "react";

import { AnalysisPanel } from "@/components/analysis-panel";
import { DraftPanel } from "@/components/draft-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { UrlForm, type ProcessingStage } from "@/components/url-form";
import { requestJson, RequestError } from "@/lib/client/request-json";
import type {
  AppErrorPayload,
  AnalyzeResponse,
  DraftLengthOption,
  DraftToneOption,
  DraftWriteResponse,
} from "@/types";

export function WriterWorkspace() {
  const [url, setUrl] = useState("");
  const [tone, setTone] = useState<DraftToneOption>("blogger");
  const [length, setLength] = useState<DraftLengthOption>("medium");
  const [extraPrompt, setExtraPrompt] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [draftResult, setDraftResult] = useState<DraftWriteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<AppErrorPayload | null>(null);
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const isPending = stage === "analyzing" || stage === "writing";

  const handleSubmit = async () => {
    try {
      setError(null);
      setErrorDetails(null);
      setAnalysisResult(null);
      setDraftResult(null);
      setStage("analyzing");

      const analysis = await requestJson<AnalyzeResponse>("/api/analyze", { url });
      setAnalysisResult(analysis);
      setStage("writing");

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
      setStage("success");
    } catch (submitError) {
      setStage("error");
      if (submitError instanceof RequestError) {
        setError(submitError.payload.error);
        setErrorDetails(submitError.payload);
        return;
      }

      setError(submitError instanceof Error ? submitError.message : "초안 생성 중 예상치 못한 오류가 발생했습니다.");
      setErrorDetails({
        error:
          submitError instanceof Error
            ? submitError.message
            : "초안 생성 중 예상치 못한 오류가 발생했습니다.",
        source: "client",
        code: "UNHANDLED_CLIENT_ERROR",
      });
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      <UrlForm
        url={url}
        tone={tone}
        length={length}
        extraPrompt={extraPrompt}
        isPending={isPending}
        error={error}
        errorDetails={errorDetails}
        stage={stage}
        onUrlChange={setUrl}
        onToneChange={setTone}
        onLengthChange={setLength}
        onExtraPromptChange={setExtraPrompt}
        onSubmit={handleSubmit}
      />

      <div className="grid gap-6">
        <AnalysisPanel analysis={analysisResult} />
        <DraftPanel draft={draftResult} />
      </div>
    </div>
  );
}
