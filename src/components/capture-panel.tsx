"use client";

import { useState } from "react";
import JSZip from "jszip";
import Image from "next/image";

import { requestJson, RequestError } from "@/lib/client/request-json";
import type { AnalyzeResponse, AppErrorPayload, CaptureGenerateResponse, CaptureItem } from "@/types";

type CapturePanelProps = {
  analysis: AnalyzeResponse | null;
};

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

async function copyImageToClipboard(dataUrl: string) {
  if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
    throw new Error("현재 브라우저에서는 이미지 클립보드 복사를 지원하지 않습니다.");
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();

  await navigator.clipboard.write([
    new window.ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
}

export function CapturePanel({ analysis }: CapturePanelProps) {
  const [count, setCount] = useState(8);
  const [avoidIntroOutro, setAvoidIntroOutro] = useState(true);
  const [result, setResult] = useState<CaptureGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<AppErrorPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!analysis) {
    return (
      <section className="section-card p-5 sm:p-6">
        <p className="panel-title">Capture</p>
        <div className="mt-4 rounded-[1.5rem] border border-dashed border-[var(--color-line)] bg-[var(--color-input-bg)] p-6 text-sm leading-6 text-[var(--color-muted)]">
          영상 분석이 먼저 완료되어야 주요 장면 캡처를 만들 수 있습니다. 초안 생성 탭에서
          링크 분석을 끝낸 뒤 이 탭으로 넘어오세요.
        </div>
      </section>
    );
  }

  const captures = result?.captures ?? [];
  const selectedCaptures = captures.filter((capture) => selectedIds.includes(capture.id));

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setErrorDetails(null);

      const response = await requestJson<CaptureGenerateResponse>("/api/capture", {
        video: {
          videoId: analysis.video.videoId,
          canonicalUrl: analysis.video.canonicalUrl,
          title: analysis.video.title,
          durationSeconds: analysis.video.durationSeconds,
        },
        analysis: {
          sceneMoments: analysis.analysis.sceneMoments,
        },
        options: {
          count,
          avoidIntroOutro,
        },
      });

      setResult(response);
      setSelectedIds(response.captures.map((capture) => capture.id));
    } catch (captureError) {
      if (captureError instanceof RequestError) {
        setError(captureError.payload.error);
        setErrorDetails(captureError.payload);
      } else {
        setError(captureError instanceof Error ? captureError.message : "영상 캡처 중 오류가 발생했습니다.");
        setErrorDetails({
          error:
            captureError instanceof Error ? captureError.message : "영상 캡처 중 오류가 발생했습니다.",
          source: "client",
          code: "UNHANDLED_CAPTURE_ERROR",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id],
    );
  };

  const handleDownloadSingle = async (capture: CaptureItem) => {
    const response = await fetch(capture.dataUrl);
    const blob = await response.blob();
    downloadBlob(blob, capture.filename);
  };

  const handleDownloadZip = async () => {
    if (selectedCaptures.length === 0) {
      return;
    }

    try {
      setIsDownloadingZip(true);
      const zip = new JSZip();

      for (const capture of selectedCaptures) {
        const [, base64] = capture.dataUrl.split(",", 2);
        zip.file(capture.filename, base64, { base64: true });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${analysis.video.videoId}-captures.zip`);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleCopy = async (capture: CaptureItem) => {
    try {
      await copyImageToClipboard(capture.dataUrl);
      setCopiedId(capture.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "이미지 복사에 실패했습니다.");
      setErrorDetails({
        error: copyError instanceof Error ? copyError.message : "이미지 복사에 실패했습니다.",
        source: "client",
        code: "CAPTURE_COPY_FAILED",
      });
    }
  };

  return (
    <section className="section-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="panel-title">Capture</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            주요 장면 캡처
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
            분석된 핵심 장면 기준으로 대표 프레임만 뽑습니다. 선택한 이미지는 바로 복사해서
            블로그 편집기에 붙여넣거나, ZIP으로 한 번에 저장할 수 있습니다.
          </p>
        </div>
        {captures.length > 0 ? (
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={selectedCaptures.length === 0 || isDownloadingZip}
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloadingZip ? "ZIP 준비 중..." : `선택본 ZIP 다운로드 (${selectedCaptures.length})`}
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-elevated)] p-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--color-ink)]">캡처 개수</span>
          <select
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-ink)]"
          >
            {[4, 6, 8, 10, 12].map((value) => (
              <option key={value} value={value}>
                {value}장
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-4 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-input-bg)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">인트로/아웃트로 제외</p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
              첫 8초와 마지막 10초 구간은 가능하면 제외합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAvoidIntroOutro((current) => !current)}
            className={`relative inline-flex h-7 w-13 items-center rounded-full px-1 ${
              avoidIntroOutro ? "bg-[var(--color-panel-strong)]" : "bg-[var(--color-neutral-bg)]"
            }`}
            aria-pressed={avoidIntroOutro}
          >
            <span
              className={`h-5 w-5 rounded-full bg-[var(--background)] transition-transform ${
                avoidIntroOutro ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex min-w-40 items-center justify-center rounded-full bg-[var(--color-panel-strong)] px-5 py-3 text-sm font-semibold text-[var(--color-panel-strong-ink)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? "캡처 생성 중..." : captures.length > 0 ? "캡처 다시 생성" : "캡처 생성"}
        </button>
      </div>

      {errorDetails ? (
        <div className="mt-4 rounded-[1.25rem] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4">
          <p className="text-sm font-semibold text-[var(--color-danger)]">{error || errorDetails.error}</p>
          <div className="mt-2 grid gap-1 text-sm leading-6 text-[var(--color-danger-soft)]">
            <p>
              <span className="font-semibold">실패 위치:</span> {errorDetails.source}
            </p>
            {typeof errorDetails.status === "number" ? (
              <p>
                <span className="font-semibold">상태 코드:</span> {errorDetails.status}
              </p>
            ) : null}
            {errorDetails.hint ? (
              <p>
                <span className="font-semibold">힌트:</span> {errorDetails.hint}
              </p>
            ) : null}
            {errorDetails.traceId ? (
              <p className="font-mono text-xs text-[var(--color-danger)]">trace: {errorDetails.traceId}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {captures.length > 0 ? (
        <>
          <div className="mt-6 flex flex-col gap-3 rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-input-bg)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[var(--color-muted)]">
              {selectedCaptures.length}장을 선택했습니다. 선택한 이미지부터 블로그 편집기에 복사하거나
              ZIP으로 내려받을 수 있습니다.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(captures.map((capture) => capture.id))}
                className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent-border)]"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent-border)]"
              >
                전체 해제
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {captures.map((capture) => {
              const selected = selectedIds.includes(capture.id);

              return (
                <article
                  key={capture.id}
                  className={`overflow-hidden rounded-[1.5rem] border bg-[var(--color-elevated)] ${
                    selected
                      ? "border-[var(--color-accent-border)] shadow-[var(--color-shadow)]"
                      : "border-[var(--color-line)]"
                  }`}
                >
                  <div className="relative border-b border-[var(--color-line)] bg-[var(--color-neutral-bg)]">
                    <Image
                      src={capture.dataUrl}
                      alt={capture.label}
                      width={1280}
                      height={720}
                      unoptimized
                      className="aspect-video w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggle(capture.id)}
                      className={`absolute right-3 top-3 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        selected
                          ? "bg-[var(--color-panel-strong)] text-[var(--color-panel-strong-ink)]"
                          : "bg-[var(--color-elevated)] text-[var(--color-ink)]"
                      }`}
                    >
                      {selected ? "선택됨" : "선택"}
                    </button>
                  </div>

                  <div className="grid gap-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                          {capture.timestampLabel}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                          {capture.label}
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm leading-6 text-[var(--color-muted)]">{capture.reason}</p>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(capture)}
                        className="rounded-full bg-[var(--color-panel-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-panel-strong-ink)] hover:opacity-90"
                      >
                        {copiedId === capture.id ? "복사됨" : "이미지 복사"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(capture)}
                        className="rounded-full border border-[var(--color-line)] bg-[var(--color-input-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent-border)]"
                      >
                        개별 다운로드
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
