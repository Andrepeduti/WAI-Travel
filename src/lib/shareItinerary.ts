import { toast } from 'sonner';

interface ShareItineraryOptions {
  title: string;
  /** Optional author name for richer share text */
  author?: string;
  /** Optional descriptive suffix (e.g. "5 dias, 12 locais") */
  description?: string;
  /** Override the URL — defaults to `/r/:datasetId` when datasetId is provided, else window.location.href */
  url?: string;
  /** Marketplace dataset id — used to build a deep link `/r/:datasetId` that abre direto no roteiro. */
  datasetId?: number | string;
}

/**
 * Opens the device's native share sheet for an itinerary.
 * Falls back to copying the link to clipboard when the Web Share API
 * isn't available (typical on desktop browsers).
 *
 * Returns `true` when the share/copy succeeded, `false` otherwise.
 */
export async function shareItinerary({
  title,
  author,
  description,
  url,
  datasetId,
}: ShareItineraryOptions): Promise<boolean> {
  const safeTitle = title?.trim() || 'Meu roteiro';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const builtUrl = datasetId != null ? `${origin}/r/${datasetId}` : '';
  const shareUrl = url || builtUrl || (typeof window !== 'undefined' ? window.location.href : '');

  const parts = [`Confira o roteiro "${safeTitle}"`];
  if (author) parts.push(`por ${author}`);
  parts.push('no WaiTravel');
  let text = parts.join(' ');
  if (description) text += ` — ${description}`;
  text += '!';

  const shareData: ShareData = {
    title: safeTitle,
    text,
    url: shareUrl,
  };

  // Native share sheet (mobile + supported browsers)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      // canShare is optional; when present, validate compatibility
      if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
        throw new Error('share-data-unsupported');
      }
      await navigator.share(shareData);
      return true;
    } catch (err: any) {
      // User cancelled — silently exit
      if (err?.name === 'AbortError') return false;
      // Otherwise fall through to clipboard fallback
    }
  }

  // Fallback: copy link
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copiado!', {
      description: 'Cole onde quiser para compartilhar o roteiro.',
    });
    return true;
  } catch {
    toast.error('Não foi possível compartilhar', {
      description: 'Tente novamente em instantes.',
    });
    return false;
  }
}
