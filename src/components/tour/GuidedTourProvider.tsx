import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TOUR_RESTART_EVENT, TOUR_STEPS, TOUR_STORAGE_KEY } from './tourSteps';
import { TourOverlay } from './TourOverlay';

interface GuidedTourContextValue {
  isActive: boolean;
  stepIndex: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
}

const GuidedTourContext = createContext<GuidedTourContextValue | undefined>(undefined);

export function useGuidedTour() {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error('useGuidedTour must be used inside GuidedTourProvider');
  return ctx;
}

interface ProviderProps {
  children: ReactNode;
}

export function GuidedTourProvider({ children }: ProviderProps) {
  const { session, onboardingCompleted } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const autoStartedRef = useRef(false);

  const markCompleted = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(() => {
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const skip = useCallback(() => {
    setIsActive(false);
    markCompleted();
  }, [markCompleted]);

  const next = useCallback(() => {
    setStepIndex((prev) => {
      const nextIdx = prev + 1;
      if (nextIdx >= TOUR_STEPS.length) {
        setIsActive(false);
        markCompleted();
        return prev;
      }
      return nextIdx;
    });
  }, [markCompleted]);

  const prev = useCallback(() => {
    setStepIndex((p) => Math.max(0, p - 1));
  }, []);

  // Auto-start once after onboarding for new authenticated users.
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!session?.user?.id) return;
    if (onboardingCompleted !== true) return;
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(TOUR_STORAGE_KEY) === '1';
    } catch {
      /* ignore */
    }
    if (alreadySeen) {
      autoStartedRef.current = true;
      return;
    }
    autoStartedRef.current = true;
    // Slight delay so the home shell renders & targets exist.
    const t = window.setTimeout(() => {
      setStepIndex(0);
      setIsActive(true);
    }, 600);
    return () => window.clearTimeout(t);
  }, [session?.user?.id, onboardingCompleted]);

  // Listen for manual restart events (Central de ajuda).
  useEffect(() => {
    const handler = () => {
      try {
        localStorage.removeItem(TOUR_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setStepIndex(0);
      setIsActive(true);
    };
    window.addEventListener(TOUR_RESTART_EVENT, handler);
    return () => window.removeEventListener(TOUR_RESTART_EVENT, handler);
  }, []);

  const value = useMemo<GuidedTourContextValue>(
    () => ({ isActive, stepIndex, start, next, prev, skip }),
    [isActive, stepIndex, start, next, prev, skip],
  );

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
      {isActive && <TourOverlay stepIndex={stepIndex} onNext={next} onPrev={prev} onSkip={skip} />}
    </GuidedTourContext.Provider>
  );
}
