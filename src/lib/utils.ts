import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) : value;
  if (isNaN(num)) return '0,00';
  return num.toFixed(2).replace('.', ',');
}

import { Capacitor } from '@capacitor/core';

/**
 * Retorna a URL de redirecionamento baseada no ambiente
 * - No mobile (Capacitor), retorna o custom scheme `com.waitravel.app://`
 * - Na web, retorna a origem atual (`window.location.origin`)
 */
export function getRedirectUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path.replace('/', '') : path;
  
  if (Capacitor.isNativePlatform()) {
    // Esse scheme deve corresponder ao registrado no Android/iOS e no capacitor.config.ts (appId)
    return `com.waitravel.app://${cleanPath}`;
  }
  
  return `${window.location.origin}/${cleanPath}`;
}
