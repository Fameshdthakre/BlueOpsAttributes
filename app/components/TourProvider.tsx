"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";

interface TourContextType {
  startTour: () => void;
  stopTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface CustomStep {
  target: string;
  content: string;
  route: string;
  placement?:
    | "bottom"
    | "top"
    | "left"
    | "right"
    | "bottom-left"
    | "bottom-right";
}

const TOUR_STEPS: CustomStep[] = [
  {
    target: "#tour-dashboard-stats",
    content:
      "Welcome to BlueOps! Your new Dashboard gives you a birds-eye view of all your tool usage and recent sessions in one place.",
    route: "/dashboard",
    placement: "bottom",
  },
  {
    target: "#tour-api-keys",
    content:
      "To power the AI extraction, you must first paste in at least one API key here.",
    route: "/settings",
    placement: "bottom-left",
  },
  {
    target: "#tour-attribute-master",
    content:
      "Attribute Master automates extracting specific product data directly from ASINs using AI and Excel templates.",
    route: "/input",
    placement: "bottom-right",
  },
  {
    target: "#tour-aplus-publisher",
    content:
      "A+ Publisher lets you build beautiful Amazon A+ content modules and map images seamlessly.",
    route: "/aplus-publisher",
    placement: "bottom-right",
  },
  {
    target: "#tour-image-auditor",
    content:
      "Image Auditor compares your product images against competitors to find visual gaps and opportunities.",
    route: "/image-auditor",
    placement: "bottom-right",
  },
  {
    target: "#tour-listing-auditor",
    content:
      "Listing Auditor analyzes your listing copy (title, bullets) and gives you an AI-driven scorecard.",
    route: "/listing-auditor",
    placement: "bottom-right",
  },
  {
    target: "#tour-history",
    content:
      "All your batches from every tool are saved here permanently. You're ready to go!",
    route: "/history",
    placement: "bottom-right",
  },
];

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isAuthRoute = pathname === "/" || pathname === "/login" || pathname === "/signup";

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const tourCompleted = localStorage.getItem("blueops_tour_completed");
    if (!tourCompleted) {
      setShowWelcomeModal(true);
    }
  }, []);

  const lastNavigatedStep = useRef<number | null>(null);

  useEffect(() => {
    if (isAuthRoute) return;

    if (run && TOUR_STEPS[stepIndex]) {
      if (lastNavigatedStep.current !== stepIndex) {
        const targetRoute = TOUR_STEPS[stepIndex].route;
        if (pathname !== targetRoute) {
          router.push(targetRoute);
        }
        lastNavigatedStep.current = stepIndex;
      }
    }
  }, [stepIndex, run, pathname, router]);

  const stopTour = () => {
    setRun(false);
    localStorage.setItem("blueops_tour_completed", "true");
  };

  const startTour = () => {
    setStepIndex(0);
    setRun(true);
    lastNavigatedStep.current = null;
    router.push(TOUR_STEPS[0].route);
  };

  const nextStep = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex((s) => s + 1);
    } else {
      stopTour();
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1);
    }
  };

  return (
    <TourContext.Provider value={{ startTour, stopTour }}>
      {children}
      
      {/* Soft Welcome Modal */}
      {isMounted && showWelcomeModal && !isAuthRoute && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-card border border-bg-input rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-300 text-center mx-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-main mb-3">Welcome to BlueOps!</h2>
            <p className="text-text-muted mb-8 leading-relaxed">
              We've prepared a quick 6-step interactive tour to show you exactly how to automate your attribute extraction. Would you like to see it?
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => {
                  setShowWelcomeModal(false);
                  localStorage.setItem("blueops_tour_completed", "true");
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-text-muted bg-bg-input/50 hover:bg-bg-input hover:text-text-main transition-all"
              >
                Skip Tour
              </button>
              <button
                onClick={() => {
                  setShowWelcomeModal(false);
                  startTour();
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all transform hover:scale-105"
              >
                Start Tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actual Tour Tooltip */}
      {isMounted && run && (
        <TourOverlay
          step={TOUR_STEPS[stepIndex]}
          isLast={stepIndex === TOUR_STEPS.length - 1}
          isFirst={stepIndex === 0}
          onNext={nextStep}
          onPrev={prevStep}
          onStop={stopTour}
          stepCount={`${stepIndex + 1}/${TOUR_STEPS.length}`}
        />
      )}
    </TourContext.Provider>
  );
}

function TourOverlay({
  step,
  isLast,
  isFirst,
  onNext,
  onPrev,
  onStop,
  stepCount,
}: {
  step: CustomStep;
  isLast: boolean;
  isFirst: boolean;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
  stepCount: string;
}) {
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);

  // Poll for the target element to handle page navigations/async rendering
  useEffect(() => {
    let interval: any;
    let found = false;

    const findTarget = () => {
      const el = document.querySelector(step.target) as HTMLElement;
      if (el) {
        found = true;
        // Make the parent relatively positioned so our absolute tooltip attaches to it properly
        const computed = window.getComputedStyle(el);
        if (computed.position === "static") {
          el.style.position = "relative";
        }

        // Add a subtle highlight box-shadow to the target
        el.style.boxShadow = "0 0 0 4px rgba(37, 99, 235, 0.4)";
        el.style.borderRadius =
          computed.borderRadius === "0px" ? "4px" : computed.borderRadius;
        el.style.transition = "box-shadow 0.3s ease";

        setTargetEl(el);
        if (interval) clearInterval(interval);
      }
    };

    findTarget();
    if (!found) {
      interval = setInterval(findTarget, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
      // Cleanup styles
      if (targetEl) {
        targetEl.style.boxShadow = "";
      }
    };
  }, [step.target, targetEl]); // targetEl is safely included because it only updates once per step

  if (!targetEl) return null;

  // The Tooltip UI
  const Tooltip = (
    <div
      className={`absolute z-[99999] min-w-[300px] w-max max-w-sm bg-bg-dark border border-bg-input rounded-xl shadow-2xl p-5 mt-4 ml-4 pointer-events-auto
        animate-in fade-in zoom-in-95 duration-200
        ${step.placement === "bottom" ? "top-full left-1/2 -translate-x-1/2" : ""}
        ${step.placement === "bottom-right" ? "top-full right-0" : ""}
        ${step.placement === "bottom-left" ? "top-full left-0" : ""}
        ${step.placement === "right" ? "top-1/2 -translate-y-1/2 left-full ml-4" : ""}
        ${step.placement === "left" ? "top-1/2 -translate-y-1/2 right-full mr-4" : ""}
        ${step.placement === "top" ? "bottom-full left-1/2 -translate-x-1/2 mb-4" : ""}
        ${!step.placement ? "top-full left-0 mt-4" : ""}
      `}
      onClick={(e) => e.stopPropagation()} // Prevent accidental clicks on the target
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded-full">
          Step {stepCount}
        </span>
        <button
          onClick={onStop}
          className="text-text-muted hover:text-status-error transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <p className="text-sm text-text-main mb-5 leading-relaxed font-medium">
        {step.content}
      </p>

      <div className="flex justify-between items-center">
        {!isFirst ? (
          <button
            onClick={onPrev}
            className="text-sm font-semibold text-text-muted hover:text-text-main transition-colors"
          >
            Back
          </button>
        ) : (
          <button
            onClick={onStop}
            className="text-sm font-semibold text-text-muted hover:text-text-main transition-colors"
          >
            Skip Tour
          </button>
        )}

        <button
          onClick={onNext}
          className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2 rounded shadow transition-colors flex items-center gap-1"
        >
          {isLast ? "Finish Tour" : "Next"}
          {!isLast && (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  return createPortal(Tooltip, targetEl);
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
