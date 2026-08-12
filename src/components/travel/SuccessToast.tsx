import { useState, useEffect } from 'react';

interface SuccessToastProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export function SuccessToast({ 
  isVisible, 
  onClose, 
  title = 'Roteiro criado com sucesso!',
  description = 'Sua próxima viagem começa agora ✈️',
  duration = 5000,
  actionLabel,
  onAction
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
    <div className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none px-3 pt-safe-top sm:px-4">
      <div className="w-full flex justify-center">
        <div
          className={`pointer-events-auto w-full max-w-[380px] rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#9DCC36]/30 ${
            isExiting ? 'animate-toast-exit' : 'animate-toast-enter'
          }`}
          style={{ background: '#F4FAE6' }}
        >
          <div className="flex items-start gap-3">
            {/* Animated Check Icon */}
            <div 
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
              style={{ background: '#E8F5C8' }}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none"
                className="overflow-visible"
              >
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#7AB51D"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={showCheck ? 'animate-draw-check' : ''}
                  style={{
                    strokeDasharray: 24,
                    strokeDashoffset: showCheck ? 0 : 24,
                  }}
                />
              </svg>
            </div>

            {/* Text & Action */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-bold" style={{ color: '#141530' }}>
                {title}
              </p>
              <p className="text-sm mt-0.5" style={{ color: '#141530', opacity: 0.6 }}>
                {description}
              </p>
              {actionLabel && onAction && (
                <button
                  onClick={() => { onAction(); handleClose(); }}
                  className="text-sm font-semibold mt-2.5 flex items-center gap-1 hover:opacity-80 transition-opacity"
                  style={{ color: '#7AB51D' }}
                >
                  <span>{actionLabel}</span>
                  <span>→</span>
                </button>
              )}
            </div>

            {/* Right Side: Close Button & Circular Pie Timer (only when action/undo button exists) */}
            <div className={`flex flex-col items-end flex-shrink-0 ${actionLabel && onAction ? 'justify-between self-stretch min-h-[72px]' : ''}`}>
              <button
                onClick={handleClose}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-black/5 text-[#141530]"
                aria-label="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="#141530" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {/* Circular Pie Chart Progress Timer */}
              {actionLabel && onAction && (
                <div className="relative w-11 h-11 flex items-center justify-center mt-1">
                  <svg className="w-11 h-11 -rotate-90 transform" viewBox="0 0 44 44">
                    {/* Background Track */}
                    <circle
                      cx="22"
                      cy="22"
                      r="16"
                      fill="none"
                      stroke="#E2F0BD"
                      strokeWidth="3.5"
                    />
                    {/* Depleting Pie Ring */}
                    <circle
                      cx="22"
                      cy="22"
                      r="16"
                      fill="none"
                      stroke="#7AB51D"
                      strokeWidth="3.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Remaining Seconds */}
                  <span className="absolute text-[12px] font-bold" style={{ color: '#141530' }}>
                    {timeLeft}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
