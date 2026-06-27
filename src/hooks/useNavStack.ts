import { useCallback, useEffect, useRef } from 'react';

/**
 * Pilha de histórico genérica baseada em "snapshots" do estado.
 *
 * Como funciona:
 * - O componente passa um `signature` (string) que muda sempre que a tela
 *   ativa muda, e um `restore` (função) que restaura o estado atual.
 * - Sempre que `signature` muda, o snapshot ANTERIOR é empilhado.
 * - `wrapBack(fallback)` devolve um onClick que desempilha (e executa o
 *   snapshot ANTERIOR para voltar à tela onde o usuário estava). Se a pilha
 *   estiver vazia, executa o `fallback` original.
 */
export function useNavStack(signature: string, restore: () => void) {
  const stackRef = useRef<Array<{ sig: string; restore: () => void }>>([]);
  const lastRef = useRef<{ sig: string; restore: () => void } | null>(null);
  // Mantém a função de restore mais recente para a assinatura atual.
  const currentRestoreRef = useRef(restore);
  currentRestoreRef.current = restore;

  useEffect(() => {
    const prev = lastRef.current;
    if (prev && prev.sig !== signature) {
      // Evita empilhar duplicatas consecutivas
      const top = stackRef.current[stackRef.current.length - 1];
      if (!top || top.sig !== prev.sig) {
        stackRef.current.push(prev);
      }
    }
    lastRef.current = { sig: signature, restore: currentRestoreRef.current };
  }, [signature]);

  const wrapBack = useCallback((fallback: () => void) => {
    return () => {
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
        entry.restore();
      } else {
        fallback();
      }
    };
  }, []);

  const resetStack = useCallback(() => {
    stackRef.current = [];
  }, []);

  return { wrapBack, resetStack };
}
