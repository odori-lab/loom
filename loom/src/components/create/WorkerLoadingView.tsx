"use client";

import type { LoadingPhase } from "./CreateFlowContext";

interface Stage {
  label: string;
  messageHints: string[];
}

const SUBMIT_STAGES: Stage[] = [
  { label: "연결", messageHints: ["세션", "프로필 이동"] },
  { label: "포스트 수집", messageHints: ["데이터", "포스트"] },
  { label: "책 구조 분석", messageHints: ["책 구조"] },
];

const GENERATE_STAGES: Stage[] = [
  { label: "이미지 변환", messageHints: ["이미지"] },
  { label: "PDF 렌더링", messageHints: ["브라우저", "페이지", "PDF 생성"] },
  { label: "업로드", messageHints: ["업로드", "완료"] },
];

function getActiveStageIndex(
  stages: Stage[],
  message: string,
  progress: number,
): number {
  // Determine stage from message content
  for (let i = stages.length - 1; i >= 0; i--) {
    const stage = stages[i];
    if (stage && stage.messageHints.some((hint) => message.includes(hint))) {
      return i;
    }
  }
  // Fall back to progress-based stage
  const stageSize = 100 / stages.length;
  return Math.min(stages.length - 1, Math.floor(progress / stageSize));
}

interface WorkerLoadingViewProps {
  scenario: "submit" | "generate";
  progress: number;
  message: string;
  loadingPhase: LoadingPhase;
}

export function WorkerLoadingView({
  scenario,
  progress,
  message,
  loadingPhase,
}: WorkerLoadingViewProps) {
  const stages = scenario === "submit" ? SUBMIT_STAGES : GENERATE_STAGES;
  const activeStageIndex = getActiveStageIndex(stages, message, progress);

  const title =
    scenario === "submit"
      ? loadingPhase === "organizing"
        ? "책 구조를 분석하는 중이에요..."
        : "책을 만드는 중이에요..."
      : "PDF를 생성하는 중이에요...";

  const displayMessage = message || (scenario === "submit" ? "시작하는 중..." : "준비 중...");

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-8 py-12"
      style={{ animation: "fadeIn 0.3s ease-out both" }}
    >
      {/* Book SVG animation */}
      <div className="mb-8 relative">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-gray-900"
        >
          {/* Book spine */}
          <rect x="30" y="8" width="6" height="64" rx="2" fill="currentColor" />
          {/* Left cover */}
          <rect x="8" y="8" width="24" height="64" rx="3" fill="#e0e0e0" />
          {/* Right cover */}
          <rect
            x="36"
            y="8"
            width="24"
            height="64"
            rx="3"
            fill="#f0f0f0"
            style={{
              transformOrigin: "36px 40px",
              animation: "book-page-turn 2.4s ease-in-out infinite",
            }}
          />
          {/* Lines on right page */}
          <rect
            x="40"
            y="20"
            width="14"
            height="2"
            rx="1"
            fill="#d0d0d0"
            style={{
              transformOrigin: "36px 40px",
              animation: "book-page-turn 2.4s ease-in-out infinite",
            }}
          />
          <rect
            x="40"
            y="26"
            width="10"
            height="2"
            rx="1"
            fill="#d0d0d0"
            style={{
              transformOrigin: "36px 40px",
              animation: "book-page-turn 2.4s ease-in-out infinite",
            }}
          />
          <rect
            x="40"
            y="32"
            width="12"
            height="2"
            rx="1"
            fill="#d0d0d0"
            style={{
              transformOrigin: "36px 40px",
              animation: "book-page-turn 2.4s ease-in-out infinite",
            }}
          />
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h2>
      <p className="text-sm text-gray-500 mb-8 text-center">{displayMessage}</p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-2">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-400">진행 중</span>
          <span className="text-xs font-medium text-gray-700">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>
      </div>

      {/* Stage indicators */}
      <div className="w-full max-w-xs mt-6 space-y-3">
        {stages.map((stage, i) => {
          const isCompleted = i < activeStageIndex;
          const isActive = i === activeStageIndex;
          const isPending = i > activeStageIndex;

          return (
            <div key={stage.label} className="flex items-center gap-3">
              {/* Icon */}
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {isCompleted ? (
                  <svg
                    className="w-4 h-4 text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isActive ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-900 border-t-transparent animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm transition-colors duration-300 ${
                  isCompleted
                    ? "text-gray-400 line-through"
                    : isActive
                      ? "text-gray-900 font-medium"
                      : isPending
                        ? "text-gray-300"
                        : "text-gray-400"
                }`}
              >
                {stage.label}
                {isActive && message ? (
                  <span className="font-normal text-gray-500 ml-1">
                    — {displayMessage}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
