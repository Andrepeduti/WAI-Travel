import { useState } from 'react';
import { ManageCardsScreen } from '@/components/screens/ManageCardsScreen';
import { CardPaymentScreen } from '@/components/screens/CardPaymentScreen';
import { useSavedCards } from '@/hooks/useSavedCards';

interface SavedCardsSettingsScreenProps {
  onBack: () => void;
}

export function SavedCardsSettingsScreen({ onBack }: SavedCardsSettingsScreenProps) {
  const { cards, addCard, updateCard, removeCard } = useSavedCards();
  const [showCardScreen, setShowCardScreen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (showCardScreen) {
    const initial = editingIndex !== null ? cards[editingIndex] : undefined;
    return (
      <CardPaymentScreen
        onBack={() => { setShowCardScreen(false); setEditingIndex(null); }}
        onSave={(card) => {
          if (editingIndex !== null) updateCard(editingIndex, card);
          else addCard(card);
          setShowCardScreen(false);
          setEditingIndex(null);
        }}
        onDelete={editingIndex !== null ? () => {
          removeCard(editingIndex);
          setShowCardScreen(false);
          setEditingIndex(null);
        } : undefined}
        initialData={initial}
      />
    );
  }

  return (
    <ManageCardsScreen
      cards={cards}
      onBack={onBack}
      onEdit={(index) => { setEditingIndex(index); setShowCardScreen(true); }}
      onDelete={removeCard}
      onAddCard={() => { setEditingIndex(null); setShowCardScreen(true); }}
    />
  );
}
