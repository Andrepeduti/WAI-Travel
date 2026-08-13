import { useState } from 'react';
import type { SavedCard } from '@/components/screens/CardPaymentScreen';

export function useSavedCards() {
  const [cards, setCards] = useState<SavedCard[]>([]);

  const addCard = (card: SavedCard) => setCards((prev) => [...prev, card]);
  const updateCard = (index: number, card: SavedCard) =>
    setCards((prev) => prev.map((c, i) => (i === index ? card : c)));
  const removeCard = (index: number) =>
    setCards((prev) => prev.filter((_, i) => i !== index));

  return { cards, setCards, addCard, updateCard, removeCard };
}
