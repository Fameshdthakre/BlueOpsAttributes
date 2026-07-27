"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';

interface TourContextType {
  startTour: () => void;
  stopTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface CustomStep {
  target: string;
  content: string;
  route: string;
  placement?: 'bottom' | 'top' | 'left' | 'right' | 'bottom-left' | 'bottom-right';
}

const TOUR_STEPS: CustomStep[] = [
  {
    target: '#tour-api-keys',
    content: 'Welcome to BlueOps! To power the AI extraction, you must first paste in at least one API key here.',
    route: '/settings',
    placement: 'bottom-left',
  },
  {
    target: '#tour-templates',
    content: 'Next, download our Excel templates. This shows you exactly how to format your ASIN data for perfect results.',
    route: '/input',
    placement: 'bottom-right',
  },
  {
    target: '#tour-asin-upload',
    content: 'Upload your filled-out ASIN file here. We will magically map your columns for you automatically!',
    route: '/input',
    placement: 'bottom-left',
  },
  {
    target: '#tour-validation-upload',
    content: 'Want strict formatting? Upload a Validation sheet to force the AI to only pick from your allowed Dropdown values.',
    route: '/input',
    placement: 'bottom-right',
  },
  {
    target: '#tour-start-process',
    content: 'Choose how fast you want to process (up to 10 at a time), and hit Start to unleash the AI!',
    route: '/input',
    placement: 'bottom-right',
  },
  {
    target: '#tour-export',
    content: 'All your batches are saved here permanently. You can download your beautiful, color-coded Excel reports anytime. You\'re ready to go!',
    route: '/history',
    placement: 'bottom-right',
  }
];

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    const tourCompleted = localStorage.getItem('blueops_tour_completed');
    if (!tourCompleted) {
      setRun(true);
    }
  }, []);

  useEffect(() => {
    if (run && TOUR_STEPS[stepIndex]) {
      const targetRoute = TOUR_STEPS[stepIndex].route;
      if (pathname !== targetRoute) {
        router.push(targetRoute);
      }
    }
  }, [stepIndex, run, pathname, router]);

  const stopTour = () => {
    setRun(false);
    localStorage.setItem('blueops_tour_completed', 'true');
  };

  const startTour = () => {
    setStepIndex(0);
    setRun(true);
    router.push(TOUR_STEPS[0].route);
  };

  const nextStep = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      stopTour();
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setStepIndex(s => s - 1);
    }
  };

  return (
    <TourContext.Provider value={{ startTour, stopTour }}>
      {children}
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
  stepCount 
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
        if (computed.position === 'static') {
          el.style.position = 'relative';
        }
        
        // Add a subtle highlight box-shadow to the target
        el.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.4)';
        el.style.borderRadius = computed.borderRadius === '0px' ? '4px' : computed.borderRadius;
        el.style.transition = 'box-shadow 0.3s ease';

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
        targetEl.style.boxShadow = '';
      }
    };
  }, [step.target, targetEl]); // targetEl is safely included because it only updates once per step

  if (!targetEl) return null;

  // The Tooltip UI
  const Tooltip = (
    <div 
      className={`absolute z-[99999] min-w-[300px] w-max max-w-sm bg-bg-dark border border-bg-input rounded-xl shadow-2xl p-5 mt-4 ml-4 pointer-events-auto
        animate-in fade-in zoom-in-95 duration-200
        ${step.placement === 'bottom' ? 'top-full left-1/2 -translate-x-1/2' : ''}
        ${step.placement === 'bottom-right' ? 'top-full right-0' : ''}
        ${step.placement === 'bottom-left' ? 'top-full left-0' : ''}
        ${step.placement === 'right' ? 'top-1/2 -translate-y-1/2 left-full ml-4' : ''}
        ${step.placement === 'left' ? 'top-1/2 -translate-y-1/2 right-full mr-4' : ''}
        ${step.placement === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-4' : ''}
        ${!step.placement ? 'top-full left-0 mt-4' : ''}
      `}
      onClick={(e) => e.stopPropagation()} // Prevent accidental clicks on the target
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded-full">
          Step {stepCount}
        </span>
        <button onClick={onStop} className="text-text-muted hover:text-status-error transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      <p className="text-sm text-text-main mb-5 leading-relaxed font-medium">
        {step.content}
      </p>

      <div className="flex justify-between items-center">
        {!isFirst ? (
          <button onClick={onPrev} className="text-sm font-semibold text-text-muted hover:text-text-main transition-colors">
            Back
          </button>
        ) : (
          <button onClick={onStop} className="text-sm font-semibold text-text-muted hover:text-text-main transition-colors">
            Skip Tour
          </button>
        )}
        
        <button 
          onClick={onNext} 
          className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2 rounded shadow transition-colors flex items-center gap-1"
        >
          {isLast ? 'Finish Tour' : 'Next'}
          {!isLast && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
        </button>
      </div>
    </div>
  );

  return createPortal(Tooltip, targetEl);
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
