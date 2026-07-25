"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Joyride, EventData, STATUS, Step, EVENTS } from 'react-joyride';

interface TourContextType {
  startTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

// Extend the Step type to include our custom route string
interface CustomStep extends Step {
  route: string;
}

const TOUR_STEPS: CustomStep[] = [
  {
    target: '#tour-api-keys',
    content: 'Welcome to BlueOps! To power the AI extraction, you must first paste in at least one API key here.',
    route: '/settings',
    skipBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#tour-templates',
    content: 'Next, download our Excel templates. This shows you exactly how to format your ASIN data for perfect results.',
    route: '/input',
    placement: 'left',
  },
  {
    target: '#tour-asin-upload',
    content: 'Upload your filled-out ASIN file here. We will magically map your columns for you automatically!',
    route: '/input',
    placement: 'right',
  },
  {
    target: '#tour-validation-upload',
    content: 'Want strict formatting? Upload a Validation sheet to force the AI to only pick from your allowed Dropdown values.',
    route: '/input',
    placement: 'left',
  },
  {
    target: '#tour-start-process',
    content: 'Choose how fast you want to process (up to 10 at a time), and hit Start to unleash the AI!',
    route: '/process',
    placement: 'bottom',
  },
  {
    target: '#tour-export',
    content: 'All your batches are saved here permanently. You can download your beautiful, color-coded Excel reports anytime. You\'re ready to go!',
    route: '/history',
    placement: 'left',
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
      // Auto-start for new users
      setRun(true);
    }
  }, []);

  // When step changes, ensure we are on the correct route
  useEffect(() => {
    if (run && TOUR_STEPS[stepIndex]) {
      const targetRoute = TOUR_STEPS[stepIndex].route;
      if (pathname !== targetRoute) {
        router.push(targetRoute);
      }
    }
  }, [stepIndex, run, pathname, router]);

  const handleJoyrideCallback = (data: EventData) => {
    const { status, type, index, action } = data;
    
    // Finished or skipped
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRun(false);
      localStorage.setItem('blueops_tour_completed', 'true');
    } 
    // User clicked 'Next' or 'Back'
    else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === 'prev' ? -1 : 1);
      
      // Joyride handles its own index in continuous mode, but because we are 
      // routing across pages, we want to intercept and manually set it so our 
      // routing useEffect can kick in before Joyride complains about missing targets
      setStepIndex(nextIndex);
    }
  };

  const startTour = () => {
    setStepIndex(0);
    setRun(true);
    router.push(TOUR_STEPS[0].route);
  };

  return (
    <TourContext.Provider value={{ startTour }}>
      {isMounted && (
        <Joyride
          steps={TOUR_STEPS}
          run={run}
          stepIndex={stepIndex}
          continuous={true}
          onEvent={handleJoyrideCallback}
          styles={{
            buttonPrimary: {
              backgroundColor: '#0066FF',
            },
            buttonBack: {
              color: '#94A3B8',
            }
          }}
          options={{
            primaryColor: '#0066FF',
            backgroundColor: '#1E293B',
            textColor: '#F8FAFC',
            arrowColor: '#1E293B',
            zIndex: 10000,
            showProgress: true,
            buttons: ['back', 'primary', 'skip'] as Array<'back' | 'primary' | 'skip' | 'close'>,
          }}
        />
      )}
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
