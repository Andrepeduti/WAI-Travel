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
  duration = 3000,
  actionLabel,
  onAction
}: SuccessToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsExiting(false);
      setShowCheck(false);
      // Trigger check animation after card appears
      const checkTimer = setTimeout(() => setShowCheck(true), 200);
      // Auto dismiss
      const dismissTimer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => {
        clearTimeout(checkTimer);
        clearTimeout(dismissTimer);
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

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none px-3 pt-3 safe-top sm:px-4 sm:pt-4">
      <div className="w-full max-w-[430px] flex justify-center">
      <div
        className={`pointer-events-auto w-full max-w-[380px] rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#9DCC36]/30 ${
          isExiting ? 'animate-toast-exit' : 'animate-toast-enter'
        }`}
        style={{ background: '#F4FAE6' }}
      >
        <div className="flex items-start gap-3">
          {/* Animated Check Icon */}
          <div 
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
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

          {/* Text */}
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
                className="text-sm font-semibold mt-1.5"
                style={{ color: '#7AB51D' }}
              >
                {actionLabel} →
              </button>
            )}
          </div>

          {/* Close */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="#141530" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
