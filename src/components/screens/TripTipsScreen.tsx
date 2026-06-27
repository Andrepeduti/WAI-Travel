import { useState, useMemo, useRef, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import {
  Lightbulb, Utensils, Shield, Globe, Wifi, CreditCard,
  Plus, X, Check, Pencil, Trash2, Sparkles, User,
  ChevronDown, CloudSun, Bike, MapPin, CalendarCheck
} from 'lucide-react';

interface TripTipsScreenProps {
  onBack: () => void;
  destination?: string;
}

type TipSource = 'ai' | 'user';

interface Tip {
  id: string;
  category: string;
  title: string;
  description: string;
  saved: boolean;
  source: TipSource;
}

interface CategoryMeta {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  Transporte: {
    label: 'Transporte',
    icon: <Icon name="directions_subway" size={16} className="text-blue-500" />,
    iconBg: 'hsl(210 100% 52% / 0.10)',
    iconColor: 'text-blue-500',
  },
  Alimentação: {
    label: 'Alimentação',
    icon: <Utensils size={16} className="text-amber-500" />,
    iconBg: 'hsl(38 92% 50% / 0.10)',
    iconColor: 'text-amber-500',
  },
  Economia: {
    label: 'Economia',
    icon: <CreditCard size={16} className="text-emerald-500" />,
    iconBg: 'hsl(142 71% 45% / 0.10)',
    iconColor: 'text-emerald-500',
  },
  Segurança: {
    label: 'Segurança',
    icon: <Shield size={16} className="text-red-400" />,
    iconBg: 'hsl(0 84% 60% / 0.10)',
    iconColor: 'text-red-400',
  },
  Cultura: {
    label: 'Cultura',
    icon: <Globe size={16} className="text-violet-500" />,
    iconBg: 'hsl(262 83% 58% / 0.10)',
    iconColor: 'text-violet-500',
  },
  Clima: {
    label: 'Clima',
    icon: <CloudSun size={16} className="text-cyan-500" />,
    iconBg: 'hsl(190 80% 50% / 0.10)',
    iconColor: 'text-cyan-500',
  },
  Atividades: {
    label: 'Atividades',
    icon: <Bike size={16} className="text-orange-500" />,
    iconBg: 'hsl(25 95% 53% / 0.10)',
    iconColor: 'text-orange-500',
  },
  Planejamento: {
    label: 'Planejamento',
    icon: <CalendarCheck size={16} className="text-indigo-500" />,
    iconBg: 'hsl(239 84% 67% / 0.10)',
    iconColor: 'text-indigo-500',
  },
  Conectividade: {
    label: 'Conectividade',
    icon: <Wifi size={16} className="text-blue-400" />,
    iconBg: 'hsl(200 80% 55% / 0.10)',
    iconColor: 'text-blue-400',
  },
};

const CATEGORY_KEYS = Object.keys(CATEGORY_MAP);

function getCategoryMeta(cat: string): CategoryMeta {
  return CATEGORY_MAP[cat] ?? {
    label: cat,
    icon: <Lightbulb size={16} className="text-muted-foreground" />,
    iconBg: 'hsl(0 0% 90% / 0.15)',
    iconColor: 'text-muted-foreground',
  };
}

const initialTips: Tip[] = [
  {
    id: 'ai-1',
    category: 'Transporte',
    title: 'Use o GVB para transporte público',
    description: 'Compre o cartão OV-chipkaart para usar metrô, tram e ônibus com desconto. O passe de 24h custa €8,50.',
    saved: true,
    source: 'ai',
  },
  {
    id: 'ai-2',
    category: 'Alimentação',
    title: 'Experimente os stroopwafels frescos',
    description: 'Os melhores são encontrados nos mercados de rua, especialmente no Albert Cuyp Market. Peça sempre o fresco, feito na hora.',
    saved: true,
    source: 'ai',
  },
  {
    id: 'ai-3',
    category: 'Economia',
    title: 'Museus gratuitos às sextas',
    description: 'Alguns museus oferecem entrada gratuita na primeira sexta-feira do mês. Verifique o Stedelijk Museum e o FOAM.',
    saved: false,
    source: 'ai',
  },
  {
    id: 'ai-4',
    category: 'Segurança',
    title: 'Cuidado com bicicletas',
    description: 'As ciclovias são sagradas em Amsterdam. Nunca caminhe nelas! Olhe para os dois lados antes de atravessar.',
    saved: true,
    source: 'ai',
  },
  {
    id: 'ai-5',
    category: 'Cultura',
    title: 'Reserve o Anne Frank House online',
    description: 'Os ingressos esgotam semanas antes. Reserve pelo site oficial assim que abrirem as vendas (geralmente 6 semanas antes).',
    saved: true,
    source: 'ai',
  },
  {
    id: 'ai-6',
    category: 'Conectividade',
    title: 'Wi-Fi gratuito em cafés',
    description: 'A maioria dos cafés oferece Wi-Fi gratuito. O Café de Jaren e o CT Coffee & Coconuts são ótimas opções para trabalhar.',
    saved: false,
    source: 'ai',
  },
  {
    id: 'ai-7',
    category: 'Transporte',
    title: 'Explore a pé pelo Jordaan',
    description: 'O bairro Jordaan é perfeito para caminhar. Ruas estreitas, lojas vintage e cafés charmosos a cada esquina.',
    saved: false,
    source: 'ai',
  },
  {
    id: 'ai-8',
    category: 'Clima',
    title: 'Sempre leve um guarda-chuva',
    description: 'O clima muda rapidamente em Amsterdam. Um guarda-chuva compacto ou capa de chuva é essencial o ano todo.',
    saved: true,
    source: 'ai',
  },
];

export function TripTipsScreen({ onBack, destination = 'Amsterdam' }: TripTipsScreenProps) {
  const [tips, setTips] = useState<Tip[]>(initialTips);
  const [activeFilter, setActiveFilter] = useState<string>('Todas');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Swipe state
  const [swipedTip, setSwipedTip] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isDragging = useRef(false);
  const ACTION_WIDTH = 75;

  const handleTouchStart = useCallback((id: string, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback((id: string, e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    if (Math.abs(diff) > 10) isDragging.current = true;
  }, []);

  const handleTouchEnd = useCallback((id: string) => {
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 50) {
      setSwipedTip(id);
    } else if (diff < -50) {
      setSwipedTip(null);
    }
  }, []);

  // Add/edit form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORY_KEYS[0]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const categories = useMemo(() => {
    const cats = [...new Set(tips.map(t => t.category))];
    return ['Todas', ...cats];
  }, [tips]);

  const filteredTips = useMemo(() => {
    if (activeFilter === 'Todas') return tips;
    return tips.filter(t => t.category === activeFilter);
  }, [tips, activeFilter]);



  const openAddSheet = () => {
    setEditingTip(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory(CATEGORY_KEYS[0]);
    setShowAddSheet(true);
  };

  const openEditSheet = (tip: Tip) => {
    setEditingTip(tip);
    setFormTitle(tip.title);
    setFormDescription(tip.description);
    setFormCategory(tip.category);
    setShowAddSheet(true);
  };

  const saveTip = () => {
    if (!formTitle.trim()) return;
    if (editingTip) {
      setTips(prev => prev.map(t => t.id === editingTip.id ? {
        ...t,
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
      } : t));
    } else {
      const newTip: Tip = {
        id: `user-${Date.now()}`,
        category: formCategory,
        title: formTitle.trim(),
        description: formDescription.trim(),
        saved: false,
        source: 'user',
      };
      setTips(prev => [...prev, newTip]);
    }
    setShowAddSheet(false);
  };

  const deleteTip = (id: string) => {
    setTips(prev => prev.filter(t => t.id !== id));
    setShowDeleteConfirm(null);
  };

  // Group tips by category for display
  const groupedTips = useMemo(() => {
    const groups: Record<string, Tip[]> = {};
    filteredTips.forEach(tip => {
      if (!groups[tip.category]) groups[tip.category] = [];
      groups[tip.category].push(tip);
    });
    return groups;
  }, [filteredTips]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-4 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px] flex-1">Dicas de viagem</h1>
        </div>
      </header>


      {/* Category Filters */}
      <div className="px-4 pt-5 pb-1">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map(cat => {
            const isActive = cat === activeFilter;
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[13px] font-medium whitespace-nowrap transition-all active:scale-95 flex-shrink-0 ${
                  isActive
                    ? 'text-primary-foreground'
                    : 'border border-border text-muted-foreground'
                }`}
                style={isActive ? { background: '#1A1C40', color: '#fff' } : {}}
              >
                {cat !== 'Todas' && (
                  <span className="flex items-center">{getCategoryMeta(cat).icon}</span>
                )}
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tips grouped by category */}
      <div className="flex-1 px-4 pb-8 pt-4 space-y-6">
        {Object.entries(groupedTips).map(([category, catTips]) => {
          const meta = getCategoryMeta(category);
          return (
            <section key={category}>
              {/* Category heading */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: meta.iconBg }}
                >
                  {meta.icon}
                </div>
                <h2 className="text-[14px] font-semibold text-foreground">{meta.label}</h2>
                <span className="text-[12px] text-muted-foreground">{catTips.length}</span>
              </div>

              {/* Tip cards */}
              <div className="space-y-2.5">
                {catTips.map(tip => {
                  const isSwiped = swipedTip === tip.id;
                  return (
                    <div key={tip.id} className="rounded-2xl" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div className="relative overflow-hidden rounded-2xl">
                        {/* Swipe actions */}
                        <div className="absolute inset-y-0 right-[-1px] flex items-stretch" style={{ width: ACTION_WIDTH * 2 }}>
                          <button
                            onClick={() => { setSwipedTip(null); openEditSheet(tip); }}
                            className="flex-1 flex flex-col items-center justify-center gap-0.5"
                            style={{ backgroundColor: '#3587F2' }}
                          >
                            <Pencil size={16} className="text-white" />
                            <span className="text-[11px] font-medium text-white">Editar</span>
                          </button>
                          <button
                            onClick={() => { setSwipedTip(null); setShowDeleteConfirm(tip.id); }}
                            className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-destructive"
                          >
                            <Trash2 size={16} className="text-white" />
                            <span className="text-[11px] font-medium text-white">Excluir</span>
                          </button>
                        </div>

                        {/* Card content */}
                        <div
                          className="relative bg-card px-3.5 py-3 transition-transform duration-200 ease-out"
                          style={{ transform: isSwiped ? `translateX(-${ACTION_WIDTH * 2}px)` : 'translateX(0)' }}
                          onTouchStart={e => handleTouchStart(tip.id, e)}
                          onTouchMove={e => handleTouchMove(tip.id, e)}
                          onTouchEnd={() => handleTouchEnd(tip.id)}
                          onClick={() => { if (isSwiped) setSwipedTip(null); }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{
                                background: tip.source === 'ai'
                                  ? 'linear-gradient(135deg, hsl(262 83% 58% / 0.12), hsl(210 100% 52% / 0.12))'
                                  : 'hsl(142 71% 45% / 0.10)',
                              }}
                            >
                              {tip.source === 'ai'
                                ? <Sparkles size={13} className="text-violet-500" />
                                : <User size={13} className="text-emerald-500" />
                              }
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                  className="inline-flex items-center h-[18px] px-1.5 rounded text-[9px] font-semibold uppercase tracking-wider"
                                  style={{
                                    background: tip.source === 'ai' ? 'hsl(262 83% 58% / 0.08)' : 'hsl(142 71% 45% / 0.08)',
                                    color: tip.source === 'ai' ? 'hsl(262 83% 58%)' : 'hsl(142 71% 45%)',
                                  }}
                                >
                                  {tip.source === 'ai' ? 'IA' : 'Você'}
                                </span>
                              </div>
                              <h3 className="text-[13px] font-semibold text-foreground leading-snug">{tip.title}</h3>
                              <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{tip.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {filteredTips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: '#F2F2F2' }}>
              <Lightbulb size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma dica nesta categoria</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione suas próprias dicas ou mude o filtro</p>
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-10 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={openAddSheet}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[15px] font-semibold active:scale-[0.97] transition-transform shadow-lg"
          style={{ background: '#9DCC36', color: '#1A1C40' }}
        >
          <Plus size={18} strokeWidth={2.5} />
          Adicionar dica
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-2" />
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 flex-shrink-0">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Excluir dica?</h3>
                <p className="text-sm text-muted-foreground mt-1">Essa ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border border-border text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteTip(showDeleteConfirm)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground"
              >
                Excluir
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Bottom Sheet */}
      {showAddSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowAddSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-card pt-4 pb-2 px-5 z-10">
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">
                  {editingTip ? 'Editar dica' : 'Nova dica'}
                </h2>
                <button
                  onClick={() => setShowAddSheet(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: '#F2F2F2' }}
                >
                  <X size={18} style={{ color: '#1A1C40' }} />
                </button>
              </div>
            </div>

            <div className="px-5 pb-8 space-y-5 pt-2">
              {/* Category */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Categoria</label>
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground"
                  >
                    <div className="flex items-center gap-2">
                      {getCategoryMeta(formCategory).icon}
                      <span>{formCategory}</span>
                    </div>
                    <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
                  </button>
                  {showCategoryPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 py-1 max-h-48 overflow-y-auto">
                      {CATEGORY_KEYS.map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setFormCategory(cat); setShowCategoryPicker(false); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                            formCategory === cat ? 'bg-muted font-medium text-foreground' : 'text-foreground'
                          }`}
                        >
                          {getCategoryMeta(cat).icon}
                          <span>{cat}</span>
                          {formCategory === cat && <Check size={14} className="ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Título da dica</label>
                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ex: Reservar ingressos antecipadamente"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Detalhes ou contexto sobre a dica..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
              </div>

              {/* Save */}
              <button
                onClick={saveTip}
                disabled={!formTitle.trim()}
                className="w-full py-3.5 rounded-2xl text-[15px] font-semibold active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{ background: '#9DCC36', color: '#1A1C40' }}
              >
                {editingTip ? 'Salvar alterações' : 'Adicionar dica'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
