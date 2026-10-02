/**
 * Navigation & Directions helper for Google Maps.
 * Supports native Capacitor apps (deep links/intents) and web environments.
 */

import { Capacitor } from '@capacitor/core';

export interface LocationTarget {
  name: string;
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
}

/**
 * Opens turn-by-turn directions in Google Maps (native app when on mobile, or web browser).
 */
export function openGoogleMapsDirections(target: LocationTarget): void {
  const hasCoords = target.lat != null && target.lng != null && target.lat !== 0 && target.lng !== 0;
  const destination = hasCoords
    ? `${target.lat},${target.lng}`
    : encodeURIComponent([target.name, target.address, target.city].filter(Boolean).join(', '));

  // Universal Google Maps directions URL (opens native app on Android/iOS if installed, or web tab)
  const universalUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  const isNative = Capacitor.isNativePlatform();

  if (isNative && hasCoords) {
    const isAndroid = Capacitor.getPlatform() === 'android';
    const isIOS = Capacitor.getPlatform() === 'ios';

    if (isAndroid) {
      // Android Intent for Google Maps navigation
      const androidIntent = `google.navigation:q=${target.lat},${target.lng}`;
      const fallbackUrl = universalUrl;

      const link = document.createElement('a');
      link.href = androidIntent;
      link.click();

      setTimeout(() => {
        if (document.hasFocus()) {
          window.open(fallbackUrl, '_blank');
        }
      }, 700);
      return;
    }

    if (isIOS) {
      // iOS Google Maps app scheme with web fallback
      const comGoogleMapsUrl = `comgooglemaps://?daddr=${target.lat},${target.lng}&directionsmode=driving`;
      window.location.href = comGoogleMapsUrl;

      setTimeout(() => {
        if (document.hasFocus()) {
          window.open(universalUrl, '_blank');
        }
      }, 700);
      return;
    }
  }

  // Web or default fallback
  window.open(universalUrl, '_blank', 'noopener,noreferrer');
}
