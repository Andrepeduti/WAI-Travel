import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Plus, Trash2, X, Pencil, Check, MoreHorizontal, CheckCheck, Square, ArrowUpDown, ChevronDown } from 'lucide-react';
import { ReorderCategoriesScreen } from './ReorderCategoriesScreen';
import { BackButton } from '@/components/ui/BackButton';

interface TripChecklistScreenProps {
  onBack: () => void;
  destination?: string;
  onChecklistChange?: (checked: number, total: number) => void;
}

interface CheckItem {
  id: number;
  label: string;
  checked: boolean;
}

interface ChecklistCategory {
  id: string;
  title: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  items: CheckItem[];
}

const initialCategories: ChecklistCategory[] = [
{
  id: 'docs',
  title: 'Documentos',
  icon: 'description',
  iconBg: 'hsl(210 100% 52% / 0.12)',
  iconColor: 'text-blue-500',
  items: [
  { id: 1, label: 'Passaporte válido', checked: false },
  { id: 2, label: 'Visto (se necessário)', checked: false },
  { id: 3, label: 'Seguro viagem', checked: false },
  { id: 4, label: 'Reserva de hotel', checked: false },
  { id: 5, label: 'Passagem aérea', checked: false },
  { id: 6, label: 'Cartão de vacinação', checked: false }]

},
{
  id: 'clothes',
  title: 'Roupas',
  icon: 'shopping_bag',
  iconBg: 'hsl(262 83% 58% / 0.12)',
  iconColor: 'text-violet-500',
  items: [
  { id: 7, label: 'Casaco impermeável', checked: false },
  { id: 8, label: 'Roupas em camadas', checked: false },
  { id: 9, label: 'Sapato confortável para caminhada', checked: false },
  { id: 10, label: 'Cachecol e luvas', checked: false }]

},
{
  id: 'electronics',
  title: 'Eletrônicos',
  icon: 'lightbulb',
  iconBg: 'hsl(142 71% 45% / 0.12)',
  iconColor: 'text-emerald-500',
  items: [
  { id: 11, label: 'Adaptador de tomada (tipo C/F)', checked: false },
  { id: 12, label: 'Carregador portátil', checked: false }]

}];


const sectionColors = [
{ bg: 'hsl(210 100% 52% / 0.12)', color: 'text-blue-500' },
{ bg: 'hsl(262 83% 58% / 0.12)', color: 'text-violet-500' },
{ bg: 'hsl(142 71% 45% / 0.12)', color: 'text-emerald-500' },
{ bg: 'hsl(25 95% 53% / 0.12)', color: 'text-orange-500' },
{ bg: 'hsl(340 82% 52% / 0.12)', color: 'text-pink-500' },
{ bg: 'hsl(45 93% 47% / 0.12)', color: 'text-amber-500' }];


type SwipeDirection = 'left' | 'right' | null;

export function TripChecklistScreen({ onBack, destination = 'Amsterdam', onChecklistChange }: TripChecklistScreenProps) {
  const [categories, setCategories] = useState<ChecklistCategory[]>(initialCategories);
  const [newItemText, setNewItemText] = useState('');

  // Report checklist counts to parent
  useEffect(() => {
    const allItems = categories.flatMap(c => c.items);
    const checked = allItems.filter(i => i.checked).length;
    onChecklistChange?.(checked, allItems.length);
  }, [categories, onChecklistChange]);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [showEditSectionSheet, setShowEditSectionSheet] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Backward-compatible aliases to avoid stale runtime references during HMR
  const deletingSectionId = showEditSectionSheet;
  const setDeletingSectionId = setShowEditSectionSheet;
  const [editingItemId, setEditingItemId] = useState<{catId: string;itemId: number;} | null>(null);
  const [editingItemLabel, setEditingItemLabel] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCollapse = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);else
      next.add(catId);
      return next;
    });
  };


  const [swipedItem, setSwipedItem] = useState<string | null>(null); // "catId-itemId"
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const touchStart = useRef<{x: number;y: number;} | null>(null);
  const swipeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getSwipeKey = (catId: string, itemId: number) => `${catId}-${itemId}`;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    touchStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((catId: string, itemId: number, e: React.PointerEvent) => {
    if (!touchStart.current) return;
    const deltaX = e.clientX - touchStart.current.x;
    const deltaY = Math.abs(e.clientY - touchStart.current.y);
    const key = getSwipeKey(catId, itemId);

    touchStart.current = null;

    if (deltaY > 30) return;

    if (deltaX < -50) {
      // Swipe left → delete
      if (swipedItem === key && swipeDirection === 'left') {
        setSwipedItem(null);
        setSwipeDirection(null);
      } else {
        setSwipedItem(key);
        setSwipeDirection('left');
      }
    } else if (deltaX > 50) {
      // Swipe right → edit
      if (swipedItem === key && swipeDirection === 'right') {
        setSwipedItem(null);
        setSwipeDirection(null);
      } else {
        setSwipedItem(key);
        setSwipeDirection('right');
      }
    }
  }, [swipedItem, swipeDirection]);

  const toggleItem = (categoryId: string, itemId: number) => {
    setCategories((prev) =>
    prev.map((cat) =>
    cat.id === categoryId ?
    { ...cat, items: cat.items.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item) } :
    cat
    )
    );
  };

  const addItem = (categoryId: string) => {
    if (!newItemText.trim()) return;
    const newId = Date.now();
    setCategories((prev) =>
    prev.map((cat) =>
    cat.id === categoryId ?
    { ...cat, items: [...cat.items, { id: newId, label: newItemText.trim(), checked: false }] } :
    cat
    )
    );
    setNewItemText('');
    setAddingTo(null);
  };

  const deleteItem = (categoryId: string, itemId: number) => {
    setCategories((prev) =>
    prev.map((cat) =>
    cat.id === categoryId ?
    { ...cat, items: cat.items.filter((item) => item.id !== itemId) } :
    cat
    )
    );
    setSwipedItem(null);
    setSwipeDirection(null);
  };

  const startEditItem = (catId: string, item: CheckItem) => {
    setEditingItemId({ catId, itemId: item.id });
    setEditingItemLabel(item.label);
    setSwipedItem(null);
    setSwipeDirection(null);
  };

  const saveEditItem = () => {
    if (!editingItemId || !editingItemLabel.trim()) return;
    setCategories((prev) =>
    prev.map((cat) =>
    cat.id === editingItemId.catId ?
    { ...cat, items: cat.items.map((item) => item.id === editingItemId.itemId ? { ...item, label: editingItemLabel.trim() } : item) } :
    cat
    )
    );
    setEditingItemId(null);
    setEditingItemLabel('');
  };

  const deleteSection = (categoryId: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
    setShowEditSectionSheet(null);
    setShowDeleteConfirm(false);
  };

  const renameSection = (categoryId: string) => {
    if (!editSectionName.trim()) return;
    setCategories((prev) =>
    prev.map((cat) =>
    cat.id === categoryId ? { ...cat, title: editSectionName.trim() } : cat
    )
    );
    setShowEditSectionSheet(null);
    setEditSectionName('');
  };

  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    const colorIndex = categories.length % sectionColors.length;
    const color = sectionColors[colorIndex];
    const newCat: ChecklistCategory = {
      id: `section-${Date.now()}`,
      title: newSectionTitle.trim(),
      icon: 'category',
      iconBg: color.bg,
      iconColor: color.color,
      items: []
    };
    setCategories((prev) => [...prev, newCat]);
    setNewSectionTitle('');
    setShowAddSection(false);
  };

  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const handleCheckAll = () => {
    setCategories((prev) => prev.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({ ...item, checked: true }))
    })));
    setShowHeaderMenu(false);
  };

  const handleUncheckAll = () => {
    setCategories((prev) => prev.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({ ...item, checked: false }))
    })));
    setShowHeaderMenu(false);
  };

  const [showReorderScreen, setShowReorderScreen] = useState(false);

  const handleToggleReorder = () => {
    setShowReorderScreen(true);
    setShowHeaderMenu(false);
  };

  const handleSaveReorder = (orderedIds: string[]) => {
    setCategories((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return orderedIds.map((id) => map.get(id)!).filter(Boolean);
    });
    setShowReorderScreen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-4 pb-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 flex-1">Checklist</h1>
          <div className="relative">
            <button
              onClick={() => setShowHeaderMenu((prev) => !prev)}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all"
              style={{ background: '#F2F2F2' }}>
              
              <MoreHorizontal size={20} style={{ color: '#1A1C40' }} />
            </button>
            {showHeaderMenu &&
            <>
                <div className="fixed inset-0 z-30" onClick={() => setShowHeaderMenu(false)} />
                <div className="absolute right-0 top-12 z-40 w-52 bg-card rounded-xl border border-border shadow-lg py-1.5 overflow-hidden">
                  <button
                  onClick={handleCheckAll}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/50 active:bg-muted transition-colors">
                  
                    <CheckCheck size={18} className="text-muted-foreground" />
                    Marcar todos
                  </button>
                  <button
                  onClick={handleUncheckAll}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/50 active:bg-muted transition-colors">
                  
                    <Square size={18} className="text-muted-foreground" />
                    Desmarcar todos
                  </button>
                  <div className="h-px bg-border mx-3" />
                  <button
                  onClick={handleToggleReorder}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/50 active:bg-muted transition-colors">
                  
                    <ArrowUpDown size={18} className="text-muted-foreground" />
                    Reordenar categorias
                  </button>
                </div>
              </>
            }
          </div>
        </div>
      </header>

      {/* Reorder screen */}
      {showReorderScreen &&
      <div className="fixed inset-0 z-50 bg-background">
          <ReorderCategoriesScreen
          categories={categories.map((c) => ({ id: c.id, title: c.title, icon: c.icon, iconBg: c.iconBg, iconColor: c.iconColor, itemCount: c.items.length }))}
          onSave={handleSaveReorder}
          onBack={() => setShowReorderScreen(false)} />
        
        </div>
      }


      {/* Categories */}
      <div className="flex-1 px-4 pb-8 pt-10 space-y-6">

        {categories.map((cat, catIdx) => {
          const catChecked = cat.items.filter((i) => i.checked).length;
          return (
            <section key={cat.id}>
              {/* Section header */}
              <button
                onClick={() => toggleCollapse(cat.id)}
                className="flex items-center gap-2.5 mb-3 w-full text-left">
                
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cat.iconBg }}>
                  
                  <Icon name={cat.icon} size={16} className={cat.iconColor} />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">{cat.title}</h2>
                <span className="text-[12px] text-muted-foreground flex-1">{catChecked}/{cat.items.length}</span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {setShowEditSectionSheet(cat.id);setEditSectionName(cat.title);}}
                    className="flex items-center gap-1 active:scale-95 transition-transform"
                    style={{ color: '#1A1C40' }}>
                    
                    <Pencil size={13} />
                    <span className="text-[13px] font-medium">Editar</span>
                  </button>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
                  collapsedCategories.has(cat.id) ? 'rotate-180' : 'rotate-0'}`
                  } />
                
              </button>

              {/* Collapsible content */}
              <div
                className={`overflow-hidden transition-all duration-200 ${
                collapsedCategories.has(cat.id) ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`
                }>
                
                {/* Items list */}
                <div className="space-y-0">
                  {cat.items.map((item) => {
                    const key = getSwipeKey(cat.id, item.id);
                    const isSwipedLeft = swipedItem === key && swipeDirection === 'left';
                    const isSwipedRight = swipedItem === key && swipeDirection === 'right';
                    const isEditing = editingItemId?.catId === cat.id && editingItemId?.itemId === item.id;

                    return (
                      <div key={item.id} className="relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 flex items-stretch" style={{ width: 80 }}>
                          <button
                            onClick={() => startEditItem(cat.id, item)}
                            className="w-full flex flex-col items-center justify-center gap-0.5"
                            style={{ backgroundColor: '#3587F2' }}>
                            
                            <Pencil size={16} className="text-white" />
                            <span className="text-[11px] font-medium text-white">Editar</span>
                          </button>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: 80 }}>
                          <button
                            onClick={() => deleteItem(cat.id, item.id)}
                            className="w-full flex flex-col items-center justify-center gap-0.5 bg-destructive">
                            
                            <Trash2 size={16} className="text-white" />
                            <span className="text-[11px] font-medium text-white">Excluir</span>
                          </button>
                        </div>
                        <div
                          ref={(el) => {swipeRefs.current[key] = el;}}
                          className="relative z-10 bg-background flex items-center gap-3 px-1 py-3.5 border-b border-border/40 transition-transform duration-200 ease-out"
                          style={{
                            transform: isSwipedLeft ? 'translateX(-80px)' : isSwipedRight ? 'translateX(80px)' : 'translateX(0)'
                          }}
                          onPointerDown={handlePointerDown}
                          onPointerUp={(e) => handlePointerUp(cat.id, item.id, e)}
                          onClick={() => {
                            if (isSwipedLeft || isSwipedRight) {
                              setSwipedItem(null);
                              setSwipeDirection(null);
                            }
                          }}>
                          
                          {isEditing ?
                          <div className="flex items-center gap-2 flex-1">
                              <input
                              autoFocus
                              value={editingItemLabel}
                              onChange={(e) => setEditingItemLabel(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditItem()}
                              className="flex-1 text-sm bg-transparent outline-none text-foreground border-b border-border" />
                            
                              <button onClick={saveEditItem} className="text-xs font-medium px-2 py-1 rounded-lg" style={{ color: '#1A1C40' }}>
                                OK
                              </button>
                              <button onClick={() => {setEditingItemId(null);setEditingItemLabel('');}}>
                                <X size={14} className="text-muted-foreground" />
                              </button>
                            </div> :

                          <button
                            onClick={() => {
                              if (!isSwipedLeft && !isSwipedRight) toggleItem(cat.id, item.id);
                            }}
                            className="flex items-center gap-3 flex-1 text-left">
                            
                              <div className={`w-[22px] h-[22px] rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                            item.checked ? 'bg-primary' : 'border-2 border-muted-foreground/25'}`
                            }>
                                {item.checked && <Check size={14} strokeWidth={3} className="text-primary-foreground" />}
                              </div>
                              <span className={`text-[14px] flex-1 ${item.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {item.label}
                              </span>
                            </button>
                          }
                          {!isEditing && !isSwipedLeft && !isSwipedRight && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteItem(cat.id, item.id); }}
                              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all"
                              aria-label="Excluir item">
                              <X size={18} style={{ color: '#1A1C40' }} strokeWidth={2.25} />
                            </button>
                          )}
                        </div>
                      </div>);

                  })}
                </div>

                {/* Add item */}
                {addingTo === cat.id ?
                <div className="px-1 py-3 mt-1">
                    <input
                    autoFocus
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addItem(cat.id);
                      if (e.key === 'Escape') {setAddingTo(null);setNewItemText('');}
                    }}
                    onBlur={() => {if (!newItemText.trim()) {setAddingTo(null);setNewItemText('');}}}
                    placeholder="Novo item..."
                    className="w-full text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground border-b border-border pb-1" />
                  
                  </div> :

                <button
                  onClick={() => setAddingTo(cat.id)}
                  className="flex items-center gap-2 px-1 py-3 mt-1 active:opacity-70 transition-opacity"
                  style={{ color: '#1A1C40' }}>
                  
                    <Plus size={16} />
                    <span className="text-sm font-medium">Adicionar item</span>
                  </button>
                }
              </div>
            </section>);

        })}
      </div>

      {/* Edit section bottom sheet */}
      {showEditSectionSheet && !showDeleteConfirm &&
      <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => {setShowEditSectionSheet(null);setEditSectionName('');}} />
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
            <div className="bg-background rounded-t-3xl w-full w-full p-6 pb-8 animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[18px] font-bold text-foreground">Editar seção</h3>
                <button
                onClick={() => {setShowEditSectionSheet(null);setEditSectionName('');}}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#F2F2F2' }}>
                
                  <X size={18} className="text-foreground" />
                </button>
              </div>

              <label className="text-[13px] font-medium text-foreground block mb-1.5">Nome da seção</label>
              <input
              autoFocus
              value={editSectionName}
              onChange={(e) => setEditSectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && renameSection(showEditSectionSheet)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none mb-6" />
            

              <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 py-3 text-destructive active:opacity-70 transition-opacity mb-4">
              
                <Trash2 size={16} />
                <span className="text-sm font-medium">Excluir seção</span>
              </button>

              <button
              onClick={() => renameSection(showEditSectionSheet)}
              className="w-full py-3.5 rounded-2xl text-[15px] font-semibold"
              style={{ background: '#9DCC36', color: '#1A1C40' }}>
              
                Salvar
              </button>
            </div>
          </div>
        </>
      }

      {/* Delete section confirmation */}
      {showEditSectionSheet && showDeleteConfirm &&
      <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
            <div className="bg-background rounded-t-3xl w-full w-full p-6 pb-8 animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <h3 className="text-[16px] font-bold text-foreground mb-2">Excluir seção?</h3>
              <p className="text-sm text-muted-foreground mb-5">A seção e todos os seus itens serão removidos permanentemente.</p>
              <div className="flex gap-3">
                <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl border font-medium text-sm"
                style={{ borderColor: '#1A1C40', color: '#1A1C40' }}>
                
                  Cancelar
                </button>
                <button
                onClick={() => deleteSection(showEditSectionSheet)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ background: '#9DCC36', color: '#1A1C40' }}>
                
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </>
      }
    </div>);

}