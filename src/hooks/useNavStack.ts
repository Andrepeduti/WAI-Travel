import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Pilha de histórico genérica baseada em "snapshots" do estado.
 *
 * Como funciona:
 * - O componente passa um `signature` (string) que muda sempre que a tela
 *   ativa muda, o `snapshot` (dados) do estado atual e um `apply` que
 *   reaplica um snapshot.
 * - Sempre que `signature` muda, o snapshot ANTERIOR é empilhado.
 * - `wrapBack(fallback)` devolve um onClick que desempilha e restaura o
 *   snapshot ANTERIOR (a tela onde o usuário estava). Se a pilha estiver
 *   vazia, executa o `fallback`.
 * - `resetStack()` zera a pilha: use quando um fluxo termina (publicar,
 *   comprar, excluir...) ou quando o usuário troca de aba raiz.
 * - Quando o componente é desmontado por uma navegação de rota (ex.: /profile),
 *   o estado + pilha ficam guardados por entrada do histórico do router; se o
 *   usuário voltar (POP) para aquela entrada, tudo é restaurado.
 */

interface Entry<S> {
  sig: string;
  snap: S;
}

interface Saved<S> extends Entry<S> {
  stack: Entry<S>[];
}

const MAX_SAVED = 30;
// Um único componente usa esse hook (Index) — o cache é compartilhado no módulo.
const savedByKey = new Map<string, Saved<any>>();
let suppressPersist = false;

/** Descarta o estado guardado (ex.: ao sair da conta). */
export function clearNavStackPersistence() {
  savedByKey.clear();
  suppressPersist = true;
}

export function useNavStack<S>(
  signature: string,
  snapshot: S,
  apply: (snap: S) => void,
  /** `location.key` da entrada atual do histórico. */
  locationKey: string,
  /** Só restaura o estado guardado quando a entrada foi reaberta via voltar/avançar (POP). */
  restoreSaved: boolean,
) {
  const stackRef = useRef<Entry<S>[]>([]);
  const lastRef = useRef<Entry<S> | null>(null);

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const signatureRef = useRef(signature);
  signatureRef.current = signature;
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const keyRef = useRef(locationKey);
  keyRef.current = locationKey;

  // Enquanto a tela está na mesma assinatura, mantém o snapshot da tela atual
  // atualizado — na saída, é o estado mais recente dela que vai para a pilha.
  if (lastRef.current && lastRef.current.sig === signature) {
    lastRef.current.snap = snapshot;
  }

  // Reidratação (voltar de uma rota para a entrada em que o Index estava).
  const hydrateRef = useRef<{ saved: Saved<S>; passes: number } | null | undefined>(undefined);
  if (hydrateRef.current === undefined) {
    const saved = restoreSaved ? (savedByKey.get(locationKey) as Saved<S> | undefined) : undefined;
    if (saved) {
      stackRef.current = saved.stack.slice();
      hydrateRef.current = { saved, passes: 0 };
    } else {
      hydrateRef.current = null;
    }
  }

  // Layout effect: roda antes dos useEffect do componente (ex.: deep links via
  // location.state), que então prevalecem sobre o estado restaurado.
  useLayoutEffect(() => {
    suppressPersist = false;
    const h = hydrateRef.current;
    if (h) applyRef.current(h.saved.snap);
    const timer = h
      ? window.setTimeout(() => {
          // Segurança: se a restauração não convergiu, volta ao funcionamento normal.
          if (hydrateRef.current) {
            hydrateRef.current = null;
            lastRef.current = { sig: signatureRef.current, snap: snapshotRef.current };
          }
        }, 500)
      : undefined;
    return () => {
      if (timer) window.clearTimeout(timer);
      if (suppressPersist) return;
      savedByKey.set(keyRef.current, {
        sig: signatureRef.current,
        snap: snapshotRef.current,
        stack: stackRef.current.slice(),
      });
      if (savedByKey.size > MAX_SAVED) {
        const oldest = savedByKey.keys().next().value;
        if (oldest !== undefined) savedByKey.delete(oldest);
      }
    };
  }, []);

  // Se `resetStack` foi chamado, a transição que sai desta assinatura não empilha.
  const skipPushFromSigRef = useRef<string | null>(null);

  useEffect(() => {
    const h = hydrateRef.current;
    if (h) {
      h.passes += 1;
      // Aguarda a restauração aplicada no layout effect chegar à assinatura salva.
      if (signature !== h.saved.sig && h.passes < 2) return;
      hydrateRef.current = null;
      lastRef.current = { sig: signature, snap: snapshotRef.current };
      return;
    }
    const prev = lastRef.current;
    if (prev && prev.sig !== signature && prev.sig !== skipPushFromSigRef.current) {
      // Evita empilhar duplicatas consecutivas
      const top = stackRef.current[stackRef.current.length - 1];
      if (!top || top.sig !== prev.sig) {
        stackRef.current.push(prev);
      }
    }
    lastRef.current = { sig: signature, snap: snapshotRef.current };
  }, [signature]);

  // Depois do render que seguiu o reset, a regra de "não empilhar" expira.
  useEffect(() => {
    skipPushFromSigRef.current = null;
  });

  const wrapBack = useCallback(
    (fallback: () => void, options?: { skipStack?: boolean }) => {
      return () => {
        // Casos em que o "voltar" sai do Index (ex.: navigate(-1)) não usam a pilha.
        if (options?.skipStack) {
          fallback();
          return;
        }
        // Desempilha entradas até achar uma diferente da tela atual
        const currentSig = lastRef.current?.sig;
        let entry = stackRef.current.pop();
        while (entry && entry.sig === currentSig) {
          entry = stackRef.current.pop();
        }
        if (entry) {
          // Ao voltar, a tela que estamos deixando não deve virar a nova origem.
          // Isso evita o efeito "vai e volta" entre duas telas ao pressionar voltar
          // em sequência; a pilha continua representando apenas quem abriu quem.
          lastRef.current = null;
          applyRef.current(entry.snap);
        } else {
          fallback();
        }
      };
    },
    [],
  );

  const resetStack = useCallback(() => {
    stackRef.current = [];
    skipPushFromSigRef.current = signatureRef.current;
  }, []);

  return { wrapBack, resetStack };
}
