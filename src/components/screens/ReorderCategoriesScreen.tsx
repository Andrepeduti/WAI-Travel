import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { BackButton } from '@/components/ui/BackButton';

interface CategoryInfo {
  id: string;
  title: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  itemCount: number;
}

interface ReorderCategoriesScreenProps {
  categories: CategoryInfo[];
  onSave: (orderedIds: string[]) => void;
  onBack: () => void;
}

export function ReorderCategoriesScreen({ categories: initialCategories, onSave, onBack }: ReorderCategoriesScreenProps) {
  const [items, setItems] = useState<CategoryInfo[]>(initialCategories);

  const handleSave = () => {
    onSave(items.map(i => i.id));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background px-4 pt-5 pb-3">
        <div className="flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px] flex-1">Reordenar categorias</h1>
        </div>
      </header>

      <div className="flex-1 px-4 pt-2 pb-24">
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-0">
          {items.map((cat) => (
            <Reorder.Item
              key={cat.id}
              value={cat}
              className="flex items-center gap-3 px-3 py-4 rounded-xl bg-background cursor-grab active:cursor-grabbing"
              whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10 }}
              transition={{ duration: 0.2 }}
            >
              <GripVertical size={20} className="text-muted-foreground flex-shrink-0" />
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cat.iconBg }}
              >
                <Icon name={cat.icon} size={17} className={cat.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[15px] font-semibold text-foreground">{cat.title}</span>
                <span className="text-[12px] text-muted-foreground ml-2">{cat.itemCount} itens</span>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-3 bg-background border-t border-border">
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl text-base font-bold active:scale-[0.98] transition-transform"
          style={{ background: '#9DCC36', color: '#1A1C40' }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
