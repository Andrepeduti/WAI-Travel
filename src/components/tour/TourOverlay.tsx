import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOUR_STEPS, type TourStep } from './tourSteps';

interface TourOverlayProps {
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_MARGIN = 12;

function readRect(selector?: string): Rect | null {
  if (!selector) return null;
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function TourOverlay({ stepIndex, onNext, onPrev, onSkip }: TourOverlayProps) {
  const step: TourStep | undefined = TOUR_STEPS[stepIndex];
  const [rect, setRect] = useState<Rect | null>(() => readRect(step?.target));

  // Switch tab if step requires it (fire global event consumed by Index).
  useEffect(() => {
    if (!step?.ensureTab) return;
    window.dispatchEvent(new CustomEvent('wai:tour-set-tab', { detail: step.ensureTab }));
  }, [step?.ensureTab, stepIndex]);

  // Track target rect. Retry briefly because target may mount after tab switch.
  useLayoutEffect(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    let raf = 0;
    let attempts = 0;
    const update = () => {
      const r = readRect(step.target);
      if (r) {
        setRect(r);
      } else if (attempts < 30) {
        attempts += 1;
        raf = window.requestAnimationFrame(update);
      } else {
        setRect(null);
      }
    };
    update();

    const onResize = () => setRect(readRect(step.target));
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [step?.target, stepIndex]);

  // Esc dismisses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  if (!step || typeof document === 'undefined') return null;

  const isCentered = step.placement === 'center' || !step.target || !rect;
  const total = TOUR_STEPS.length;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  // Tooltip positioning
  let tooltipStyle: React.CSSProperties;
  if (isCentered) {
    tooltipStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: TOOLTIP_WIDTH,
    };
  } else if (rect) {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const placeAbove = step.placement === 'top' || rect.top > vh / 2;
    const top = placeAbove
      ? Math.max(16, rect.top - TOOLTIP_MARGIN - 8)
      : Math.min(vh - 16, rect.top + rect.height + TOOLTIP_MARGIN);
    const transform = placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';
    // Clamp horizontal center within viewport.
    const idealLeft = rect.left + rect.width / 2;
    const halfWidth = TOOLTIP_WIDTH / 2 + 16;
    const clampedLeft = Math.min(Math.max(idealLeft, halfWidth), vw - halfWidth);
    tooltipStyle = {
      top,
      left: clampedLeft,
      transform,
      width: TOOLTIP_WIDTH,
    };
  } else {
    tooltipStyle = { display: 'none' };
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] animate-fade-in"
      style={{ fontFamily: 'Urbanist, sans-serif' }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with cutout via SVG mask so the target stays interactive-looking. */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={onSkip}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && !isCentered && (
              <rect
                x={Math.max(0, rect.left - PADDING)}
                y={Math.max(0, rect.top - PADDING)}
                width={rect.width + PADDING * 2}
                height={rect.height + PADDING * 2}
                rx={16}
                ry={16}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.62)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Highlight ring around target */}
      {rect && !isCentered && (
        <div
          className="absolute pointer-events-none transition-all duration-200"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            borderRadius: 16,
            boxShadow: '0 0 0 2px rgba(157, 204, 54, 0.9), 0 8px 24px rgba(0,0,0,0.18)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute bg-white rounded-2xl shadow-2xl p-4 pointer-events-auto animate-scale-in"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: '#9DCC36' }}
          >
            {stepIndex + 1} / {total}
          </span>
          <button
            onClick={onSkip}
            className="text-[12px] font-medium"
            style={{ color: '#6B7280' }}
          >
            Pular
          </button>
        </div>
        <h3
          className="text-[16px] font-bold mb-1"
          style={{ color: '#1A1C40' }}
        >
          {step.title}
        </h3>
        <p
          className="text-[14px] leading-snug mb-4"
          style={{ color: '#4B5563' }}
        >
          {step.body}
        </p>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="text-[14px] font-semibold px-3 py-2 rounded-full disabled:opacity-40"
            style={{ color: '#1A1C40' }}
          >
            Voltar
          </button>
          <button
            onClick={onNext}
            className="text-[14px] font-semibold px-5 py-2 rounded-full"
            style={{ background: '#9DCC36', color: '#1A1C40' }}
          >
            {isLast ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
