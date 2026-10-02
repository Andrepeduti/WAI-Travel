import { ReactNode, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onBack?: () => void;
  title?: ReactNode;
  /** Optional element shown to the right in top bar (before close button) */
  headerExtra?: ReactNode;
  /** Optional element shown below the title row, still inside the fixed header */
  headerBelow?: ReactNode;
  /** Fixed footer (action buttons). Pinned to the bottom, never scrolls. */
  footer?: ReactNode;
  children: ReactNode;
  /** Max height of the entire sheet. Default 85vh. Use '100dvh' for full-screen. */
  maxHeight?: string;
  /** Surface color token */
  surface?: 'card' | 'background';
  /** Show the X close button (default true) */
  showClose?: boolean;
  /** Hide the drag handle (default false) */
  hideHandle?: boolean;
  /** Body horizontal padding (default 'px-5') */
  bodyClassName?: string;
  /** Wrapper z-index pair: overlay = z, container = z+10. Default 80. */
  zIndex?: number;
  /** Backdrop click closes (default true) */
  dismissOnBackdrop?: boolean;
}

/**
 * Canonical bottom sheet shell used across the app.
 *
 * Layout (always):
 *   ┌─ Fixed header: handle + top bar (back/close) + title (solid bg) ─┐
 *   │                                                                 │
 *   │           Scrollable body (flex-1)                              │
 *   │                                                                 │
 *   ├─ Fixed footer (solid bg, safe-area inset) ──────────────────────┤
 *
 * Only the body scrolls — header and footer stay pinned.
 */
export function BottomSheet({
  open,
  isOpen,
  onClose,
  onBack,
  title,
  headerExtra,
  headerBelow,
  footer,
  children,
  maxHeight = '85vh',
  surface = 'card',
  showClose = true,
  hideHandle = false,
  bodyClassName,
  zIndex = 80,
  dismissOnBackdrop = true,
}: BottomSheetProps) {
  const isVisible = open ?? isOpen ?? false;

  useEffect(() => {
    if (!isVisible) return;

    // Prevent body scroll when the bottom sheet is open
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalStyle;
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const bg = surface === 'card' ? 'bg-card' : 'bg-background';

  return (
    <div
      className="fixed inset-0 flex justify-center"
      style={{ zIndex, fontFamily: 'var(--font-family-primary)' }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={dismissOnBackdrop ? onClose : undefined}
      />

      {/* Container */}
      <div
        className={cn(
          'relative w-full mt-auto rounded-t-3xl shadow-2xl flex flex-col',
          'animate-in slide-in-from-bottom duration-300',
          bg,
        )}
        style={{ maxHeight, zIndex: zIndex + 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div className={cn('flex-shrink-0 rounded-t-3xl', bg)}>
          {!hideHandle && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
          )}

          {/* Top action bar with back button on left and extra/close on right */}
          {(onBack || showClose || headerExtra) && (
            <div className="flex items-center justify-between px-5 pt-2 pb-1 min-h-[36px]">
              <div>
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-muted/60 transition-colors -ml-1.5"
                    aria-label="Voltar"
                  >
                    <Icon name="chevron_left" size={22} className="text-foreground" />
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {headerExtra}
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors -mr-1.5"
                    aria-label="Fechar"
                  >
                    <Icon name="close" size={18} className="text-foreground" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Title row below action buttons */}
          {title && (
            <div className="px-5 pt-1 pb-3">
              {typeof title === 'string' ? (
                <h3 className="text-[20px] font-bold text-foreground leading-tight">{title}</h3>
              ) : (
                title
              )}
            </div>
          )}

          {headerBelow}
        </div>

        {/* Scrollable body */}
        <div
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain',
            bodyClassName ?? 'px-5 pb-5',
          )}
        >
          {children}
        </div>

        {/* Fixed footer */}
        {footer && (
          <div
            className={cn('flex-shrink-0 border-t border-border/40 px-5 pt-3', bg)}
            style={{ paddingBottom: 'max(34px, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}

        {/* When no footer, still respect safe area */}
        {!footer && (
          <div
            className="flex-shrink-0"
            style={{ height: 'max(34px, env(safe-area-inset-bottom))' }}
          />
        )}
      </div>
    </div>
  );
}
