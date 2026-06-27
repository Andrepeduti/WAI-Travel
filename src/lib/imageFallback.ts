// Global image fallback: any <img> that fails to load is swapped to a generic placeholder.
// Inline SVG data URI guarantees the fallback itself never breaks.

const FALLBACK_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#E8EEDC'/>
          <stop offset='100%' stop-color='#CFE0A3'/>
        </linearGradient>
      </defs>
      <rect width='400' height='300' fill='url(#g)'/>
      <g fill='none' stroke='#1A1C40' stroke-opacity='0.35' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'>
        <circle cx='200' cy='130' r='34'/>
        <path d='M200 90 v-18 M200 188 v18 M160 130 h-18 M240 130 h18 M168 98 l-13 -13 M232 98 l13 -13 M168 162 l-13 13 M232 162 l13 13'/>
        <path d='M120 230 q40 -30 80 0 t80 0' />
      </g>
    </svg>`
  );

export const FALLBACK_IMAGE = FALLBACK_SRC;

const swapped = new WeakSet<HTMLImageElement>();

export function installGlobalImageFallback() {
  if (typeof window === "undefined") return;
  if ((window as any).__imgFallbackInstalled) return;
  (window as any).__imgFallbackInstalled = true;

  const handle = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target || target.tagName !== "IMG") return;
    const img = target as HTMLImageElement;
    if (swapped.has(img)) return;
    if (img.src === FALLBACK_SRC) return;
    swapped.add(img);
    img.src = FALLBACK_SRC;
    img.srcset = "";
  };

  // Capture phase to intercept before component-level handlers.
  window.addEventListener("error", handle, true);
}
