import { useEffect, useRef } from 'react';

/**
 * Registro global de "camadas de voltar".
 *
 * Toda tela (ou sub-tela) que tem uma seta de voltar registra aqui o handler
 * enquanto estiver montada. O gesto de arrastar da borda esquerda (e qualquer
 * outro "voltar" global, ex.: botão físico do Android) executa o handler da
 * camada que está mais ao topo — exatamente o mesmo que o toque na setinha.
 */
export interface BackEntry {
  /** Sempre aponta para o handler mais recente da camada. */
  handler: () => void;
  /** Elemento da seta de voltar (quando existe) — usado p/ checar visibilidade e overlays. */
  getElement?: () => HTMLElement | null;
}

const entries: BackEntry[] = [];

export function registerBackEntry(entry: BackEntry) {
  entries.push(entry);
  return () => {
    const i = entries.indexOf(entry);
    if (i >= 0) entries.splice(i, 1);
  };
}

/** Camada de voltar mais ao topo que está realmente visível, ou null. */
export function getTopBackEntry(): BackEntry | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!entry.getElement) return entry;
    const el = entry.getElement();
    if (el && el.isConnected && el.getClientRects().length > 0) return entry;
  }
  return null;
}

/**
 * Registra `handler` como "voltar" da tela enquanto `enabled` for true.
 * Use em telas com cabeçalho próprio (que não usam o `BackButton`).
 */
export function useBackHandler(
  handler: () => void,
  enabled = true,
  getElement?: () => HTMLElement | null,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    return registerBackEntry({ handler: () => handlerRef.current(), getElement });
    // `getElement` é estável (lê uma ref) — registramos uma vez por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
