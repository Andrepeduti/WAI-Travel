import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackHandler } from '@/lib/backStack';
import {
  Plus,
  Trash2,
  X,
  Pencil,
  Check,
  MoreHorizontal,
  CheckCheck,
  CircleDot,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  Tag,
  RotateCcw,
} from 'lucide-react';
import { LuggageIllustration } from '@/components/ui/LuggageIllustration';
import {
  ChecklistCategory,
  ChecklistItem,
  getLocalChecklist,
  loadChecklist,
  saveChecklist,
  generateDefaultChecklist,
  generateUUID,
} from '@/lib/checklistApi';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { Reorder, useDragControls, motion, AnimatePresence } from 'framer-motion';
import { GripVertical } from 'lucide-react';

interface TripChecklistScreenProps {
  onBack: () => void;
  destination?: string;
  itineraryId?: string;
  isPurchased?: boolean;
  onChecklistChange?: (checked: number, total: number) => void;
  readOnlyMode?: boolean;
}

// ─── Componente de Item da Categoria (Arrastável) ─────────────────────────
const CategoryItem = ({
  cat,
  isCollapsed,
  toggleCollapse,
  handleOpenEditCategory,
  toggleItem,
  deleteItem,
  addingItemToCatId,
  setAddingItemToCatId,
  newItemText,
  setNewItemText,
  addItem,
  readOnlyMode,
}: {
  cat: ChecklistCategory;
  isCollapsed: boolean;
  toggleCollapse: (id: string) => void;
  handleOpenEditCategory: (cat: ChecklistCategory) => void;
  toggleItem: (catId: string, itemId: string) => void;
  deleteItem: (catId: string, itemId: string) => void;
  addingItemToCatId: string | null;
  setAddingItemToCatId: (id: string | null) => void;
  newItemText: string;
  setNewItemText: (text: string) => void;
  addItem: (catId: string) => void;
  readOnlyMode?: boolean;
}) => {
  const dragControls = useDragControls();
  const itemCount = cat.items.length;

  return (
    <Reorder.Item
      value={cat}
      dragListener={false}
      dragControls={dragControls}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="bg-[#FFFFFF] rounded-[16px] p-6 shadow-sm flex flex-col gap-6"
      whileDrag={{ scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', zIndex: 10 }}
    >
      {/* Header do Accordion */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* O arrasto agora é acionado APENAS pelo ícone */}
          {!readOnlyMode && (
            <div
              className="text-[#7F7F7F] p-1 -ml-1 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
            >
              <GripVertical size={20} />
            </div>
          )}
          <div
            onClick={() => toggleCollapse(cat.id)}
            className="flex flex-col select-none min-w-0"
          >
            <h3 className="font-['Urbanist'] font-semibold text-[18px] leading-[22px] text-[#171F2C] truncate">
              {cat.title}
            </h3>
            <span className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F] whitespace-nowrap">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Botão de Editar Categoria */}
          {!readOnlyMode && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditCategory(cat);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:scale-95 transition-all text-[#516D12]"
              aria-label={`Editar categoria ${cat.title}`}
            >
              <Pencil size={16} strokeWidth={2.2} />
            </button>
          )}

          {/* Chevron de expansão/colapso */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(cat.id);
            }}
            className={`w-6 h-6 flex items-center justify-center text-[#171F2C] transition-transform duration-200 cursor-pointer ${isCollapsed ? 'rotate-180' : 'rotate-0'
              }`}
          >
            <ChevronDown size={20} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Corpo do Accordion (Lista de Itens) */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col">
                <AnimatePresence initial={false}>
                  {cat.items.map((item: ChecklistItem) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="overflow-hidden border-b border-transparent [&:not(:last-child)]:border-[#D5D5D5]"
                    >
                      <div className="flex items-center justify-between gap-2 py-3">
                        {/* Checkbox clicável e label */}
                        <button
                          onClick={readOnlyMode ? undefined : () => toggleItem(cat.id, item.id)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <div
                            className={`w-[22px] h-[22px] rounded-[5px] flex items-center justify-center flex-shrink-0 transition-all ${item.checked
                                ? 'bg-[#9DCC36] border-[1.5px] border-[#9DCC36] text-[#141530]'
                                : 'border-[1.5px] border-[#7F7F7F] bg-transparent'
                              }`}
                          >
                            {item.checked && (
                              <Check
                                size={14}
                                strokeWidth={3.5}
                                className="text-[#141530]"
                              />
                            )}
                          </div>

                          <span
                            className={`font-['Urbanist'] font-semibold text-[14px] leading-[17px] break-words flex-1 ${item.checked
                                ? 'line-through text-[#7F7F7F]'
                                : 'text-[#171F2C]'
                              }`}
                          >
                            {item.label}
                          </span>
                        </button>

                        {/* Botão Excluir Item */}
                        {!readOnlyMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(cat.id, item.id);
                            }}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[#141530] hover:bg-black/5 active:scale-95 transition-all flex-shrink-0"
                            aria-label="Excluir item"
                          >
                            <X size={14} strokeWidth={2.2} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Rodapé do Accordion: + Adicionar item */}
              {!readOnlyMode && (
                <div className="pt-2">
                  {addingItemToCatId === cat.id ? (
                    <div className="flex items-center gap-2 pt-1 pb-1">
                      <input
                        autoFocus
                        type="text"
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addItem(cat.id);
                          if (e.key === 'Escape') {
                            setAddingItemToCatId(null);
                            setNewItemText('');
                          }
                        }}
                        placeholder="Nome do item..."
                        className="flex-1 px-3 py-2 text-[14px] font-['Urbanist'] font-medium bg-[#EDEDED] rounded-[8px] outline-none text-[#141530] placeholder:text-[#7F7F7F] border border-transparent focus:border-border"
                      />
                      <button
                        onClick={() => addItem(cat.id)}
                        className="px-3.5 py-2 rounded-[8px] text-xs font-bold font-['Urbanist'] bg-[#9DCC36] text-[#141530] active:scale-95 transition-transform"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => {
                          setAddingItemToCatId(null);
                          setNewItemText('');
                        }}
                        className="p-1 text-[#7F7F7F] hover:text-[#141530]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingItemToCatId(cat.id);
                        setNewItemText('');
                      }}
                      className="flex items-center gap-2 font-['Urbanist'] font-bold text-[14px] leading-[17px] text-[#141530] active:opacity-70 transition-opacity"
                    >
                      <Plus size={16} strokeWidth={2.5} className="text-[#141530]" />
                      <span>Adicionar item</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
};


export function TripChecklistScreen({
  onBack,
  destination = 'Amsterdam',
  itineraryId,
  isPurchased = false,
  onChecklistChange,
  readOnlyMode,
}: TripChecklistScreenProps) {
  // Arrastar da borda esquerda executa o mesmo que a seta de voltar.
  useBackHandler(onBack);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [categories, setCategories] = useState<ChecklistCategory[]>(() => {
    if (itineraryId) {
      const local = getLocalChecklist(itineraryId);
      if (local !== null && local.length > 0) return local;
    }
    return generateDefaultChecklist();
  });

  // Carregar dados salvos (localStorage + Supabase)
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (itineraryId) {
        const saved = await loadChecklist(itineraryId);
        if (isMounted && saved !== null && saved.length > 0) {
          setCategories(saved);
        }
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [itineraryId]);

  // Reportar contagem de itens para o componente pai
  useEffect(() => {
    const allItems = categories.flatMap((c) => c.items);
    const checked = allItems.filter((i) => i.checked).length;
    onChecklistChange?.(checked, allItems.length);
  }, [categories, onChecklistChange]);

  // Travar o scroll da tela de trás (body)
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Persistir categorias com debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const persistCategories = useCallback(
    (newCategories: ChecklistCategory[]) => {
      setCategories(newCategories);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        saveChecklist(itineraryId, newCategories);
      }, 300);
    },
    [itineraryId],
  );

  // Estados de controle de colapso do accordion
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCollapse = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Estados de Bottom Sheets e Modais
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAddCategorySheet, setShowAddCategorySheet] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [editingCategory, setEditingCategory] = useState<ChecklistCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ChecklistCategory | null>(null);

  // Estado para adição inline de item
  const [addingItemToCatId, setAddingItemToCatId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  const [deletedItemInfo, setDeletedItemInfo] = useState<{
    categoryId: string;
    item: ChecklistItem;
    index: number;
  } | null>(null);
  const [showUndoDeleteToast, setShowUndoDeleteToast] = useState(false);

  // ─── Manipulação de Itens ──────────────────────────────────────────────────

  const toggleItem = (categoryId: string, itemId: string | number) => {
    const updated = categories.map((cat) =>
      cat.id === categoryId
        ? {
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item,
          ),
        }
        : cat,
    );
    persistCategories(updated);
  };

  const addItem = (categoryId: string) => {
    const trimmed = newItemText.trim();
    if (!trimmed) {
      setAddingItemToCatId(null);
      setNewItemText('');
      return;
    }

    const newItem: ChecklistItem = {
      id: generateUUID(),
      label: trimmed,
      checked: false,
    };

    const updated = categories.map((cat) =>
      cat.id === categoryId ? { ...cat, items: [...cat.items, newItem] } : cat,
    );

    persistCategories(updated);
    setNewItemText('');
    setAddingItemToCatId(null);
  };

  const deleteItem = (categoryId: string, itemId: string | number) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      const index = cat.items.findIndex((i) => i.id === itemId);
      if (index !== -1) {
        setDeletedItemInfo({ categoryId, item: cat.items[index], index });
        setShowUndoDeleteToast(true);
      }
    }

    const updated = categories.map((cat) =>
      cat.id === categoryId
        ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) }
        : cat,
    );
    persistCategories(updated);
  };

  const handleUndoDelete = () => {
    if (!deletedItemInfo) return;

    const updated = categories.map((cat) => {
      if (cat.id === deletedItemInfo.categoryId) {
        const newItems = [...cat.items];
        newItems.splice(deletedItemInfo.index, 0, deletedItemInfo.item);
        return { ...cat, items: newItems };
      }
      return cat;
    });

    persistCategories(updated);
    setDeletedItemInfo(null);
    setShowUndoDeleteToast(false);
  };

  // ─── Manipulação de Categorias ─────────────────────────────────────────────

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const newCat: ChecklistCategory = {
      id: generateUUID(),
      title: trimmed,
      icon: 'category',
      iconBg: 'hsl(210 100% 52% / 0.12)',
      iconColor: 'text-blue-500',
      items: [],
    };

    const updated = [...categories, newCat];
    persistCategories(updated);
    setNewCategoryName('');
    setShowAddCategorySheet(false);
    setShowSuccessToast(true);
  };

  const handleOpenEditCategory = (cat: ChecklistCategory) => {
    setEditingCategory(cat);
    setEditCategoryName(cat.title);
  };

  const handleSaveEditCategory = () => {
    if (!editingCategory || !editCategoryName.trim()) return;

    const updated = categories.map((cat) =>
      cat.id === editingCategory.id ? { ...cat, title: editCategoryName.trim() } : cat,
    );

    persistCategories(updated);
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleRequestDeleteCategory = () => {
    if (!editingCategory) return;
    setCategoryToDelete(editingCategory);
    setEditingCategory(null);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const updated = categories.filter((cat) => cat.id !== categoryToDelete.id);
    persistCategories(updated);
    setShowDeleteConfirm(false);
    setCategoryToDelete(null);
  };

  // ─── Ações Gerais (3 Pontinhos) ────────────────────────────────────────────

  const handleCheckAll = () => {
    const updated = categories.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({ ...item, checked: true })),
    }));
    persistCategories(updated);
    setShowHeaderMenu(false);
  };

  const handleUncheckAll = () => {
    const updated = categories.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({ ...item, checked: false })),
    }));
    persistCategories(updated);
    setShowHeaderMenu(false);
  };

  const handleResetChecklist = () => {
    const defaultChecklist = generateDefaultChecklist();
    persistCategories(defaultChecklist);
    setShowHeaderMenu(false);
  };

  const isEmpty = categories.length === 0;

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[#F3F3F3] flex flex-col font-['Urbanist',sans-serif]">
      <SuccessToast
        isVisible={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        title="Categoria adicionada com sucesso!"
        position="screen-bottom"
      />

      <SuccessToast
        isVisible={showUndoDeleteToast}
        onClose={() => setShowUndoDeleteToast(false)}
        title="Item excluído"
        actionLabel="Desfazer"
        onAction={handleUndoDelete}
        position="screen-bottom"
      />

      {/* ─── Topbar Header (Figma specs: flat chevron sem background circular branco) ─── */}
      <header
        className="sticky top-0 z-20 bg-[#F3F3F3] px-6 pb-3"
        style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}
      >
        <div className="flex items-center justify-between gap-4 h-[38px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="p-1 -ml-1 text-[#171F2C] hover:opacity-70 active:scale-95 transition-all flex items-center justify-center"
            >
              <ChevronLeft size={22} strokeWidth={2.5} className="text-[#171F2C]" />
            </button>
            <h1 className="font-['Urbanist'] font-bold text-[20px] leading-[24px] text-[#171F2C] my-0">
              Checklist
            </h1>
          </div>

          {/* Botão 3 pontinhos (Menu de Ações) */}
          {!isEmpty && !readOnlyMode && (
            <button
              onClick={() => setShowHeaderMenu(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:scale-95 transition-all flex-shrink-0"
              aria-label="Opções do checklist"
            >
              <MoreHorizontal size={22} className="text-[#141530]" />
            </button>
          )}
        </div>
      </header>

      {/* ─── Estado Vazio (Empty State) [Figma CSS: Frame 1321316331] ─── */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-6 max-w-[345px]">
            {/* Frame 1321316334: gap 16px */}
            <div className="flex flex-col items-center gap-4">
              {/* Group 481513: width 119px, height 113.32px */}
              <LuggageIllustration width={119} height={114} />

              {/* Frame 1321316333: gap 8px */}
              <div className="flex flex-col items-center gap-2 max-w-[293px]">
                {/* Title: 600, 18px, line-height 22px, #171F2C */}
                <h2 className="font-['Urbanist'] font-semibold text-[18px] leading-[22px] text-[#171F2C] my-0">
                  Nenhum checklist criado
                </h2>
                {/* Subtitle: 500, 14px, line-height 16px, #7F7F7F */}
                <p className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#7F7F7F] text-center my-0 max-w-[293px]">
                  Crie um checklist para não esquecer nada antes ou durante a viagem.
                </p>
              </div>
            </div>

            {/* Main button: border 1px solid #141530, border-radius 16px, h 48px, font 16px bold #141530 */}
            {!readOnlyMode && (
              <button
                onClick={() => {
                  setNewCategoryName('');
                  setShowAddCategorySheet(true);
                }}
                className="h-[48px] px-6 rounded-[16px] border border-[#141530] bg-[#F3F3F3] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] hover:bg-black/5 active:scale-95 transition-all flex items-center justify-center shadow-none"
              >
                Criar checklist
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ─── Estado Preenchido (Listagem) [image_e1afee.png - Esquerda] ─── */
        <div className="flex-1 px-6 pb-12 pt-6 flex flex-col gap-6">
          {/* Botão + Adicionar categoria (Figma: gap 8px, font 14px bold, text #141530) */}
          {!readOnlyMode && (
            <div>
              <button
                onClick={() => {
                  setNewCategoryName('');
                  setShowAddCategorySheet(true);
                }}
                className="flex items-center gap-2 font-['Urbanist'] font-bold text-[14px] leading-[17px] text-[#141530] active:opacity-70 transition-opacity"
              >
                <Plus size={16} strokeWidth={2.5} className="text-[#141530]" />
                <span>Adicionar categoria</span>
              </button>
            </div>
          )}

          {/* Lista de Categorias (Accordion Cards: bg #FFFFFF, border-radius 16px, padding 24px, gap 24px) */}
          <Reorder.Group axis="y" values={categories} onReorder={persistCategories} className="flex flex-col gap-6">
            {categories.map((cat) => (
              <CategoryItem
                key={cat.id}
                cat={cat}
                isCollapsed={collapsedCategories.has(cat.id)}
                toggleCollapse={toggleCollapse}
                handleOpenEditCategory={handleOpenEditCategory}
                toggleItem={toggleItem}
                deleteItem={deleteItem}
                addingItemToCatId={addingItemToCatId}
                setAddingItemToCatId={setAddingItemToCatId}
                newItemText={newItemText}
                setNewItemText={setNewItemText}
                addItem={addItem}
                readOnlyMode={readOnlyMode}
              />
            ))}
          </Reorder.Group>
        </div>
      )}

      {/* ─── Bottom Sheet: Ações Gerais (Menu 3 Pontinhos) [Figma CSS] ─── */}
      {showHeaderMenu && (
        <div className="fixed inset-0 z-50 flex justify-center font-['Urbanist',sans-serif]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setShowHeaderMenu(false)}
          />

          <div
            className="relative w-full mt-auto rounded-t-[24px] bg-[#FFFFFF] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button bar */}
            <div className="flex items-center justify-end px-6 pt-6 pb-3">
              <button
                type="button"
                onClick={() => setShowHeaderMenu(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 active:scale-95 transition-all text-[#000000]"
                aria-label="Fechar"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-8 flex flex-col gap-6">
              <h3 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] my-0">
                Checklist
              </h3>

              <div className="flex flex-col gap-5">
                <button
                  onClick={handleCheckAll}
                  className="w-full flex items-center justify-between text-left group active:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <CheckCheck size={16} className="text-[#141530]" strokeWidth={2.5} />
                    </div>
                    <span className="font-['Urbanist'] font-medium text-[16px] leading-[19px] text-[#141530]">
                      Marcar todos
                    </span>
                  </div>
                </button>

                <div className="w-full h-0 border-b border-[#F2F2F2]" />

                <button
                  onClick={handleUncheckAll}
                  className="w-full flex items-center justify-between text-left group active:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <CircleDot size={16} className="text-[#141530]" strokeWidth={2.5} />
                    </div>
                    <span className="font-['Urbanist'] font-medium text-[16px] leading-[19px] text-[#141530]">
                      Desmarcar todos
                    </span>
                  </div>
                </button>

                <div className="w-full h-0 border-b border-[#F2F2F2]" />

                <button
                  onClick={handleResetChecklist}
                  className="w-full flex items-center justify-between text-left group active:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <RotateCcw size={16} className="text-[#141530]" strokeWidth={2.5} />
                    </div>
                    <span className="font-['Urbanist'] font-medium text-[16px] leading-[19px] text-[#141530]">
                      Restaurar checklist padrão
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Sheet: Adicionar Categoria [Figma CSS] ─── */}
      {showAddCategorySheet && (
        <div className="fixed inset-0 z-50 flex justify-center font-['Urbanist',sans-serif]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setShowAddCategorySheet(false)}
          />

          <div
            className="relative w-full mt-auto rounded-t-[24px] bg-[#FFFFFF] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top close button bar */}
            <div className="flex items-center justify-end px-6 pt-6 pb-3">
              <button
                type="button"
                onClick={() => setShowAddCategorySheet(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 active:scale-95 transition-all text-[#000000]"
                aria-label="Fechar"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Content (Figma: padding 0 24px 24px, gap 32px) */}
            <div className="px-6 pb-8 flex flex-col gap-6">
              <h3 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] my-0">
                Adicionar categoria
              </h3>

              {/* Input container Search (Figma: bg #EDEDED, border-radius 12px, padding 8px 12px, height 54px) */}
              <div className="bg-field border border-transparent focus-within:border-primary transition-colors rounded-[12px] px-3 py-2 flex items-center gap-3 h-[54px]">
                <Tag size={16} className="text-[#7F7F7F] flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                  <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                    Nome da categoria
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Ex: Documentos, Roupas..."
                    className="w-full font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] bg-transparent outline-none placeholder:text-[#949494]/60"
                  />
                </div>
              </div>

              {/* Main button (Figma: bg #9DCC36, border-radius 16px, height 48px, font 16px bold) */}
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className="w-full h-[48px] rounded-[16px] bg-[#9DCC36] text-[#141530] disabled:bg-[#EDEDED] disabled:text-[#949494] font-['Urbanist'] font-bold text-[16px] leading-[19px] flex items-center justify-center transition-all active:scale-[0.99]"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Sheet: Editar Categoria [Figma CSS: Frame 1321316155] ─── */}
      {editingCategory !== null && (
        <div className="fixed inset-0 z-50 flex justify-center font-['Urbanist',sans-serif]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setEditingCategory(null)}
          />

          <div
            className="relative w-full mt-auto rounded-t-[24px] bg-[#FFFFFF] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top close button bar (Figma: padding 24px 24px 12px, justify-end) */}
            <div className="flex items-center justify-end px-6 pt-6 pb-3">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 active:scale-95 transition-all text-[#000000]"
                aria-label="Fechar"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Content (Figma: padding 0 24px 24px, gap 32px) */}
            <div className="px-6 pb-8 flex flex-col gap-6">
              {/* Title: Editar categoria (Figma: 600, 22px, line-height 26px, #171F2C) */}
              <h3 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] my-0">
                Editar categoria
              </h3>

              {/* Input container Search (Figma: bg #EDEDED, border-radius 12px, padding 8px 12px, height 54px) */}
              <div className="bg-field border border-transparent focus-within:border-primary transition-colors rounded-[12px] px-3 py-2 flex items-center gap-3 h-[54px]">
                <Tag size={16} className="text-[#7F7F7F] flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                  <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                    Nome da categoria
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEditCategory()}
                    className="w-full font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] bg-transparent outline-none"
                  />
                </div>
              </div>

              {/* Excluir categoria button (Figma: gap 12px, font 16px 500, color #D00004) */}
              <button
                onClick={handleRequestDeleteCategory}
                className="flex items-center gap-3 text-[#D00004] hover:opacity-80 active:opacity-60 transition-opacity py-1"
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} strokeWidth={1.75} className="text-[#D00004]" />
                </div>
                <span className="font-['Urbanist'] font-medium text-[16px] leading-[19px] text-[#D00004]">
                  Excluir categoria
                </span>
              </button>

              {/* Main button Salvar (Figma: bg #9DCC36, border-radius 16px, height 48px, font 16px bold) */}
              <button
                onClick={handleSaveEditCategory}
                disabled={!editCategoryName.trim()}
                className="w-full h-[48px] rounded-[16px] bg-[#9DCC36] text-[#141530] disabled:bg-[#EDEDED] disabled:text-[#949494] font-['Urbanist'] font-bold text-[16px] leading-[19px] flex items-center justify-center transition-all active:scale-[0.99]"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Sheet: Confirmação de Exclusão [Figma CSS: Frame 1321316155 / height 256px] ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex justify-center font-['Urbanist',sans-serif]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => {
              setShowDeleteConfirm(false);
              setCategoryToDelete(null);
            }}
          />

          <div
            className="relative w-full mt-auto rounded-t-[24px] bg-[#FFFFFF] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top action bar: back button < on left, close X on right (Figma: padding 24px 24px 12px, h 60px, justify-between) */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3 h-[60px]">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  if (categoryToDelete) {
                    setEditingCategory(categoryToDelete);
                  }
                }}
                className="w-6 h-6 flex items-center justify-center text-[#000000] hover:opacity-70 active:scale-95 transition-all -ml-1"
                aria-label="Voltar"
              >
                <ChevronLeft size={22} strokeWidth={2.5} className="text-[#000000]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCategoryToDelete(null);
                }}
                className="w-6 h-6 flex items-center justify-center hover:opacity-70 active:scale-95 transition-all text-[#000000] -mr-1"
                aria-label="Fechar"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Content (Figma: padding 16px 24px 32px, gap 32px) */}
            <div className="px-6 pb-8 pt-2 flex flex-col gap-8">
              {/* Frame 1321316436: gap 8px */}
              <div className="flex flex-col gap-2">
                {/* Title: 600, 22px, line-height 26px, #171F2C */}
                <h3 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] my-0">
                  Tem certeza que deseja excluir esta categoria?
                </h3>
                {/* Subtitle / Category name: 500, 14px, line-height 20px, #7F7F7F */}
                <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F] my-0">
                  {categoryToDelete?.title || 'Categoria'}
                </p>
              </div>

              {/* Action buttons (Figma: Frame 1321316525: gap 16px, h 48px) */}
              <div className="flex items-center gap-4">
                {/* Cancelar (Figma: border 1px solid #141530, border-radius 16px, h 48px, font 16px bold #141530) */}
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setCategoryToDelete(null);
                  }}
                  className="flex-1 h-[48px] rounded-[16px] border border-[#141530] bg-[#FFFFFF] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] hover:bg-black/5 active:scale-95 transition-all flex items-center justify-center"
                >
                  Cancelar
                </button>
                {/* Confirmar (Figma: bg #9DCC36, border-radius 16px, h 48px, font 16px bold #141530) */}
                <button
                  onClick={handleConfirmDeleteCategory}
                  className="flex-1 h-[48px] rounded-[16px] bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] hover:brightness-105 active:scale-95 transition-all flex items-center justify-center"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
