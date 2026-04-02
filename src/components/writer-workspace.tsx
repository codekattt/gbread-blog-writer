"use client";

import { useState } from "react";

import { AnalysisPanel } from "@/components/analysis-panel";
import { CapturePanel } from "@/components/capture-panel";
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

type WorkspaceTab = "draft" | "capture";

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
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("draft");

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

      <div className="grid gap-4">
        <div className="inline-flex w-full max-w-md rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-1.5 shadow-[var(--color-shadow)]">
          {(
            [
              { id: "draft", label: "초안 생성" },
              { id: "capture", label: "영상 캡처" },
            ] as const
          ).map((tab) => {
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold ${
                  selected
                    ? "bg-[var(--color-panel-strong)] text-[var(--color-panel-strong-ink)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-elevated-soft)] hover:text-[var(--color-ink)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "draft" ? (
          <div className="grid gap-6">
            <AnalysisPanel analysis={analysisResult} />
            <DraftPanel draft={draftResult} />
          </div>
        ) : (
          <CapturePanel
            key={analysisResult?.video.videoId ?? "capture-empty"}
            analysis={analysisResult}
          />
        )}
      </div>
    </div>
  );
}
