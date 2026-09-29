import { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface SuccessToastProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  /** 'above-nav' fica logo acima da BottomNavigation (usa --toast-bottom-offset). */
  /** 'screen-bottom' fica colado ao rodapé da tela (sem navbar nem FAB). */
  position?: 'top' | 'bottom' | 'above-nav' | 'screen-bottom';
}

export function SuccessToast({
  isVisible,
  onClose,
  title = 'Roteiro criado com sucesso!',
  duration = 5000,
  actionLabel,
  onAction,
  position = 'top'
}: SuccessToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [progress, setProgress] = useState(1);
  const [timeLeft, setTimeLeft] = useState(Math.ceil(duration / 1000));

  useEffect(() => {
    if (isVisible) {
      setIsExiting(false);
      setShowCheck(false);
      setProgress(1);
      setTimeLeft(Math.ceil(duration / 1000));

      // Trigger check animation after card appears
      const checkTimer = setTimeout(() => setShowCheck(true), 200);

      // Smooth countdown progress update (50ms interval)
      const startTime = Date.now();
      const timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        setProgress(remaining / duration);
        setTimeLeft(Math.ceil(remaining / 1000));
      }, 50);

      // Auto dismiss
      const dismissTimer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => {
        clearTimeout(checkTimer);
        clearTimeout(dismissTimer);
        clearInterval(timerInterval);
      };
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
      setShowCheck(false);
    }, 400);
  };

  if (!isVisible && !isExiting) return null;

  const circumference = 2 * Math.PI * 16; // r=16 -> 100.53
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      className={`fixed inset-x-0 z-[200] flex justify-center pointer-events-none px-4 ${position === 'top' ? 'top-0' : ''}`}
      style={position === 'top'
        ? { paddingTop: 'calc(max(15px, env(safe-area-inset-top)))' }
        : position === 'above-nav'
          ? { bottom: 'calc(var(--toast-bottom-offset, 0px) + 12px)' }
          : position === 'screen-bottom'
            ? { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }
            : { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}
    >
      <div
        className={`pointer-events-auto flex flex-row items-center justify-between px-4 gap-6 relative shadow-lg w-full ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'
          }`}
        style={{
          minHeight: '49px',
          background: '#3C8622',
          borderRadius: '16px',
        }}
      >
        {/* Left icon + Text Section */}
        <div className="flex-1 flex flex-row items-center justify-start min-w-0 py-2 gap-2">
          <CheckCircle2 size={16} strokeWidth={2} className="text-white flex-shrink-0" />
          <div className="flex flex-col">
            <p className="text-[14px] font-medium text-white leading-tight font-['Urbanist']">
              {title}
            </p>
          </div>
        </div>

        {/* Right Section: Undo button or Close */}
        <div className="flex flex-row items-center justify-end flex-shrink-0">
          {actionLabel && onAction ? (
            <button
              onClick={() => { onAction(); handleClose(); }}
              className="text-sm font-bold text-white hover:text-white/80 active:scale-95 transition-all"
            >
              {actionLabel}
            </button>
          ) : null}
          {!actionLabel && (
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition-colors"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
