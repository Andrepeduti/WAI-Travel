import { useEffect } from 'react';
import { getTopBackEntry, type BackEntry } from '@/lib/backStack';

/** Faixa da borda esquerda (px) onde o gesto pode começar — igual ao iOS. */
const EDGE_PX = 24;
/** Distância mínima (px) para confirmar o "voltar" ao soltar. */
const COMMIT_DISTANCE = 90;
/** Ou: arrasto curto porém rápido (px/ms). */
const COMMIT_MIN_DISTANCE = 40;
const COMMIT_VELOCITY = 0.5;
const INDICATOR_SIZE = 40;

/** Há um dialog/sheet aberto que não pertence à camada de voltar do topo? Então ignora o gesto. */
function blockedByOverlay(entry: BackEntry) {
  const dialog = document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  );
  if (!dialog) return false;
  const el = entry.getElement?.();
  return !(el && dialog.contains(el));
}

function createIndicator() {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${INDICATOR_SIZE}px`,
    height: `${INDICATOR_SIZE}px`,
    borderRadius: '9999px',
    background: '#fff',
    color: '#111',
    boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: '2147483000',
    willChange: 'transform, opacity',
  } as Partial<CSSStyleDeclaration>);
  el.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  document.body.appendChild(el);
  return el;
}

/**
 * Gesto de "voltar" estilo iPhone: arrastar da borda esquerda para a direita
 * executa o mesmo handler da seta de voltar da tela que está no topo
 * (ver `lib/backStack`). Montado uma única vez, na raiz do app.
 */
export function SwipeBackGesture() {
  useEffect(() => {
    const indicator = createIndicator();
    let tracking = false;
    let locked = false;
    let startX = 0;
    let startY = 0;
    let startT = 0;

    const render = (dx: number, y: number) => {
      const progress = Math.min(Math.max(dx, 0) / COMMIT_DISTANCE, 1);
      const x = -INDICATOR_SIZE + progress * (INDICATOR_SIZE + 16);
      indicator.style.display = 'flex';
      indicator.style.opacity = String(0.35 + progress * 0.65);
      indicator.style.transition = 'none';
      indicator.style.transform = `translate(${x}px, ${y - INDICATOR_SIZE / 2}px) scale(${0.7 + progress * 0.3})`;
    };

    const hide = () => {
      indicator.style.transition = 'transform 160ms ease-out, opacity 160ms ease-out';
      indicator.style.opacity = '0';
      indicator.style.transform = indicator.style.transform.replace(/translate\([^)]*\)/, `translate(${-INDICATOR_SIZE}px, 0px)`);
      window.setTimeout(() => {
        if (!tracking) indicator.style.display = 'none';
      }, 180);
    };

    const reset = () => {
      tracking = false;
      locked = false;
    };

    const onStart = (e: TouchEvent) => {
      reset();
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > EDGE_PX) return;
      if ((e.target as Element | null)?.closest?.('[data-swipe-back-ignore]')) return;
      const entry = getTopBackEntry();
      if (!entry || blockedByOverlay(entry)) return;
      tracking = true;
      startX = t.clientX;
      startY = t.clientY;
      startT = performance.now();
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        // Intenção vertical (rolagem) ou para a esquerda: não é o gesto de voltar.
        if (Math.abs(dy) > Math.abs(dx) || dx < 0) {
          reset();
          return;
        }
        locked = true;
      }
      // Evita rolagem/overscroll enquanto o gesto está em andamento.
      if (e.cancelable) e.preventDefault();
      render(dx, t.clientY);
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking || !locked) {
        reset();
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const velocity = dx / Math.max(performance.now() - startT, 1);
      reset();
      hide();
      const committed = dx >= COMMIT_DISTANCE || (dx >= COMMIT_MIN_DISTANCE && velocity >= COMMIT_VELOCITY);
      if (!committed) return;
      // Resolve de novo: a camada do topo pode ter mudado durante o gesto.
      getTopBackEntry()?.handler();
    };

    const onCancel = () => {
      if (locked) hide();
      reset();
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
      indicator.remove();
    };
  }, []);

  return null;
}
