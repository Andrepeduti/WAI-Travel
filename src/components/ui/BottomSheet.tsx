import { ReactNode, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Optional element shown to the right of the title (before close button) */
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
 *   ┌─ Fixed header: handle + title + close (solid bg) ─┐
 *   │                                                    │
 *   │           Scrollable body (flex-1)                 │
 *   │                                                    │
 *   ├─ Fixed footer (solid bg, safe-area inset) ────────┤
 *
 * Only the body scrolls — header and footer stay pinned.
 */
export function BottomSheet({
  open,
  onClose,
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

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
          'relative w-full max-w-[430px] mt-auto rounded-t-3xl shadow-2xl flex flex-col',
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
          {(title || showClose || headerExtra) && (
            <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-3">
              <div className="flex-1 min-w-0">
                {typeof title === 'string' ? (
                  <h3 className="text-[17px] font-bold text-foreground truncate">{title}</h3>
                ) : (
                  title
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {headerExtra}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
                    aria-label="Fechar"
                  >
                    <Icon name="close" size={18} className="text-foreground" />
                  </button>
                )}
              </div>
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
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}

        {/* When no footer, still respect safe area */}
        {!footer && (
          <div
            className="flex-shrink-0"
            style={{ height: 'env(safe-area-inset-bottom)' }}
          />
        )}
      </div>
    </div>
  );
}
