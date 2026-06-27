import { useEffect, useState } from 'react';
import type { SavedCard } from '@/components/screens/CardPaymentScreen';

const STORAGE_KEY = 'wt_saved_cards_v1';

function read(): SavedCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useSavedCards() {
  const [cards, setCards] = useState<SavedCard[]>(() => read());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch {}
  }, [cards]);

  // Sync across tabs / other instances in same tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setCards(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addCard = (card: SavedCard) => setCards((prev) => [...prev, card]);
  const updateCard = (index: number, card: SavedCard) =>
    setCards((prev) => prev.map((c, i) => (i === index ? card : c)));
  const removeCard = (index: number) =>
    setCards((prev) => prev.filter((_, i) => i !== index));

  return { cards, setCards, addCard, updateCard, removeCard };
}
