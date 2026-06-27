import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { useCart } from '@/contexts/CartContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PurchasesScreenProps {
  onBack: () => void;
  onNavigateToItinerary?: (id: number) => void;
  onResumeCheckout?: (id: number) => void;
}

interface PurchasedItinerary {
  id: number;
  title: string;
  image: string;
  author: string;
  authorImage: string;
  price: number;
  purchaseDate: string;
  rating: number | null;
  review: string;
  transactionId: string;
  paymentMethod: 'pix' | 'card';
  status: 'paid' | 'pending_payment';
  dueDate?: string;
}

const mockPurchases: PurchasedItinerary[] = [
  {
    id: 0,
    title: 'Lisboa e Porto em 8 dias',
    image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400',
    author: 'Rafael Lima',
    authorImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
    price: 44.90,
    purchaseDate: '2025-01-08',
    rating: null,
    review: '',
    transactionId: 'TXN-2025010800019',
    paymentMethod: 'pix',
    status: 'pending_payment',
    dueDate: '2025-01-09',
  },
  {
    id: 1,
    title: '7 dias na Itália: Roma, Florença e Veneza',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400',
    author: 'Marina Costa',
    authorImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    price: 49.90,
    purchaseDate: '2024-12-15',
    rating: null,
    review: '',
    transactionId: 'TXN-2024121500042',
    paymentMethod: 'pix',
    status: 'paid',
  },
  {
    id: 2,
    title: 'Mochilão pela Tailândia - 15 dias',
    image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400',
    author: 'Pedro Alves',
    authorImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    price: 39.90,
    purchaseDate: '2024-11-20',
    rating: 5,
    review: 'Roteiro incrível! Muito detalhado e com dicas ótimas.',
    transactionId: 'TXN-2024112000038',
    paymentMethod: 'card',
    status: 'paid',
  },
  {
    id: 3,
    title: 'Paris em 5 dias - Guia Completo',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400',
    author: 'Camila Souza',
    authorImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
    price: 29.90,
    purchaseDate: '2024-10-05',
    rating: 4,
    review: 'Muito bom, só faltou mais opções de restaurantes.',
    transactionId: 'TXN-2024100500027',
    paymentMethod: 'pix',
    status: 'paid',
  },
];

const SUGGESTION_CHIPS = ['Roteiro detalhado', 'Boas dicas', 'Fácil de seguir', 'Bom custo-benefício'];

export function PurchasesScreen({ onBack, onNavigateToItinerary, onResumeCheckout }: PurchasesScreenProps) {
  const [purchases, setPurchases] = useState<PurchasedItinerary[]>(mockPurchases);
  const { items: cartItems, removeFromCart } = useCart();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'unpaid'>('all');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [tempRating, setTempRating] = useState(0);
  const [tempReview, setTempReview] = useState('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [receiptId, setReceiptId] = useState<number | null>(null);

  const openReview = (item: PurchasedItinerary, initialRating?: number) => {
    setReviewingId(item.id);
    setTempRating(initialRating ?? item.rating ?? 0);
    setTempReview(item.review || '');
    setSelectedChips([]);
  };

  const toggleChip = (chip: string) => {
    setSelectedChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const submitReview = () => {
    if (reviewingId === null) return;
    const chipsText = selectedChips.length > 0 ? selectedChips.join(' • ') : '';
    const finalReview = tempReview.trim()
      ? tempReview
      : chipsText;
    setPurchases(prev =>
      prev.map(p =>
        p.id === reviewingId ? { ...p, rating: tempRating, review: finalReview } : p
      )
    );
    setReviewingId(null);
    setTempRating(0);
    setTempReview('');
    setSelectedChips([]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) + ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const receiptItem = purchases.find(p => p.id === receiptId);
  const reviewingItem = purchases.find(p => p.id === reviewingId);
  const pendingCount = purchases.filter(p => p.status === 'paid' && p.rating === null).length;
  const unpaidCount = purchases.filter(p => p.status === 'pending_payment').length;
  const visiblePurchases =
    activeTab === 'all'
      ? purchases
      : activeTab === 'pending'
        ? purchases.filter(p => p.status === 'paid' && p.rating === null)
        : purchases.filter(p => p.status === 'pending_payment');

  const [cancelId, setCancelId] = useState<number | null>(null);
  const cancelItem = purchases.find(p => p.id === cancelId);

  const handleCancelPurchase = () => {
    if (cancelId === null) return;
    setPurchases(prev => prev.filter(p => p.id !== cancelId));
    setCancelId(null);
    toast.success('Compra excluída');
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <BackButton onClick={onBack} />
        <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
          Minhas Compras
        </h1>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-1">
        <div className="flex items-center gap-6 border-b" style={{ borderColor: 'hsl(var(--divider))' }}>
          <button
            onClick={() => setActiveTab('all')}
            className="relative pb-2.5 pt-1"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: activeTab === 'all' ? '#141530' : 'hsl(var(--muted-foreground))',
            }}
          >
            Todos
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#141530' }} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className="relative pb-2.5 pt-1 flex items-center gap-1.5"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: activeTab === 'pending' ? '#141530' : 'hsl(var(--muted-foreground))',
            }}
          >
            Para avaliar
            {pendingCount > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full px-1.5"
                style={{
                  background: '#F5A524',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'var(--font-weight-bold)',
                  minWidth: '18px',
                  height: '18px',
                }}
              >
                {pendingCount}
              </span>
            )}
            {activeTab === 'pending' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#141530' }} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('unpaid')}
            className="relative pb-2.5 pt-1 flex items-center gap-1.5"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: activeTab === 'unpaid' ? '#141530' : 'hsl(var(--muted-foreground))',
            }}
          >
            A pagar
            {unpaidCount > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full px-1.5"
                style={{
                  background: '#F5A524',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'var(--font-weight-bold)',
                  minWidth: '18px',
                  height: '18px',
                }}
              >
                {unpaidCount}
              </span>
            )}
            {activeTab === 'unpaid' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#141530' }} />
            )}
          </button>
        </div>
      </div>

      {/* Purchases List */}
      {(

      <div className="px-5 space-y-4 mt-4">
        {visiblePurchases.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'hsl(var(--muted))' }}>
              <Icon
                name={activeTab === 'unpaid' ? 'credit_card' : activeTab === 'pending' ? 'star' : 'shopping_bag'}
                size={24}
                className="text-muted-foreground"
              />
            </div>
            <p className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              {activeTab === 'unpaid' ? 'Nenhum pagamento pendente' : activeTab === 'pending' ? 'Tudo avaliado!' : 'Nenhuma compra ainda'}
            </p>
            <p className="text-muted-foreground mt-1" style={{ fontSize: 'var(--text-xs)' }}>
              {activeTab === 'unpaid'
                ? 'Você não tem roteiros aguardando pagamento.'
                : activeTab === 'pending'
                  ? 'Você não tem roteiros pendentes de avaliação.'
                  : 'Suas compras vão aparecer aqui.'}
            </p>
          </div>
        )}

        {visiblePurchases.map(item => (
          <div key={item.id} className="card-base overflow-hidden">
            {/* Product header */}
            <div className="flex gap-3 p-3">
              <button
                onClick={() => onNavigateToItinerary?.(item.id)}
                className="flex-shrink-0"
              >
                <img src={item.image} alt={item.title} className="w-20 h-20 rounded-xl object-cover" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onNavigateToItinerary?.(item.id)}
                    className="text-left flex-1 min-w-0"
                  >
                    <h3 className="text-foreground line-clamp-2" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                      {item.title}
                    </h3>
                  </button>
                  {item.status !== 'pending_payment' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="flex items-center justify-center w-8 h-8 rounded-full active:scale-95 transition-transform"
                          style={{ color: '#1A1C40' }}
                        >
                          <Icon name="more_vert" size={18} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[160px]">
                        <DropdownMenuItem
                          onClick={() => {
                            onNavigateToItinerary?.(item.id);
                            toast.success('Roteiro resgatado para suas viagens');
                          }}
                        >
                          <Icon name="refresh" size={16} className="mr-2" />
                          Resgatar roteiro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setReceiptId(item.id)}>
                          <Icon name="receipt" size={16} className="mr-2" />
                          Ver recibo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <img src={item.authorImage} alt={item.author} className="w-4 h-4 rounded-full object-cover" />
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>{item.author}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-bold)' }}>
                    R$ {item.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                    {formatDate(item.purchaseDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action area */}
            <div className="px-3 pb-3 pt-2.5 border-t" style={{ borderColor: 'hsl(var(--divider))' }}>
              {item.status === 'pending_payment' ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: '#B45309' }}>
                      Aguardando pagamento
                    </span>
                    {item.dueDate && (
                      <span className="text-muted-foreground" style={{ fontSize: '10px' }}>
                        Vence em {formatDate(item.dueDate)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCancelId(item.id)}
                      className="w-10 h-10 flex items-center justify-center rounded-full border bg-transparent active:scale-95 transition-transform"
                      style={{ borderColor: 'hsl(var(--divider))' }}
                      aria-label="Excluir compra"
                    >
                      <Icon name="delete" size={18} style={{ color: '#DA501F' }} />
                    </button>
                    <button
                      onClick={() => onResumeCheckout?.(item.id)}
                      className="rounded-full px-4 py-2"
                      style={{ background: '#9DCC36', color: '#141530', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}
                    >
                      Pagar agora
                    </button>
                  </div>
                </div>
              ) : item.rating === null ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                    Avaliação rápida
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => openReview(item, star)}
                        className="p-1 -m-1"
                        aria-label={`${star} estrelas`}
                      >
                        <Icon
                          name="star"
                          size={22}
                          style={{ color: 'hsl(var(--muted-foreground) / 0.3)' }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Icon
                          key={star}
                          name="star"
                          size={16}
                          style={{ color: star <= item.rating! ? 'hsl(var(--sun-normal))' : 'hsl(var(--muted-foreground) / 0.3)' }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => openReview(item)}
                      style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: '#141530' }}
                    >
                      Editar avaliação
                    </button>
                  </div>
                  {item.review && (
                    <p className="text-muted-foreground line-clamp-2 mt-2" style={{ fontSize: 'var(--text-xs)' }}>
                      "{item.review}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Receipt Bottom Sheet */}
      {receiptId !== null && receiptItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReceiptId(null)} />
          <div className="relative w-full max-w-[430px] bg-background rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-5" />
            <h3 className="text-foreground text-center mb-5" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
              Comprovante de Compra
            </h3>

            <div className="rounded-2xl border p-4 space-y-3.5" style={{ borderColor: 'hsl(var(--divider))' }}>
              <div className="flex gap-3">
                <img src={receiptItem.image} alt={receiptItem.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-foreground line-clamp-2" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {receiptItem.title}
                  </h4>
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>{receiptItem.author}</span>
                </div>
              </div>

              <div className="border-t" style={{ borderColor: 'hsl(var(--divider))' }} />

              <div className="space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>ID da transação</span>
                  <span className="text-foreground" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                    {receiptItem.transactionId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>Data da compra</span>
                  <span className="text-foreground" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                    {formatDateTime(receiptItem.purchaseDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>Forma de pagamento</span>
                  <span className="text-foreground" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                    {receiptItem.paymentMethod === 'pix' ? 'Pix' : 'Cartão'}
                  </span>
                </div>

                <div className="border-t" style={{ borderColor: 'hsl(var(--divider))' }} />

                <div className="flex justify-between">
                  <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-bold)' }}>Total pago</span>
                  <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-bold)' }}>
                    R$ {receiptItem.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
              <Icon name="check_circle" size={14} style={{ color: '#9DCC36' }} />
              <span>Pagamento confirmado</span>
            </div>

            <button
              onClick={() => {
                const text = `Comprovante de Compra\n\nProduto: ${receiptItem.title}\nAutor: ${receiptItem.author}\nID: ${receiptItem.transactionId}\nData: ${formatDateTime(receiptItem.purchaseDate)}\nPagamento: ${receiptItem.paymentMethod === 'pix' ? 'Pix' : 'Cartão'}\nTotal: R$ ${receiptItem.price.toFixed(2).replace('.', ',')}\n\nPagamento confirmado.`;
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comprovante-${receiptItem.transactionId}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl py-3"
              style={{ background: '#141530', color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}
            >
              <Icon name="download" size={18} />
              Baixar comprovante
            </button>
          </div>
        </div>
      )}

      {/* Review Bottom Sheet */}
      {reviewingId !== null && reviewingItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReviewingId(null)} />
          <div className="relative w-full max-w-[430px] bg-background rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />

            {/* Itinerary header */}
            <div className="flex items-center gap-3 mb-4">
              <img src={reviewingItem.image} alt={reviewingItem.title} className="w-12 h-12 rounded-xl object-cover" />
              <div className="min-w-0">
                <h3 className="text-foreground line-clamp-1" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-bold)' }}>
                  {reviewingItem.title}
                </h3>
                <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  {reviewingItem.author}
                </p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 mb-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setTempRating(star)} className="p-1.5">
                  <Icon
                    name="star"
                    size={36}
                    style={{ color: star <= tempRating ? 'hsl(var(--sun-normal))' : 'hsl(var(--muted-foreground) / 0.25)' }}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-muted-foreground mb-4" style={{ fontSize: 'var(--text-xs)' }}>
              {tempRating === 0 ? 'Toque para avaliar' :
               tempRating === 5 ? 'Excelente!' :
               tempRating === 4 ? 'Muito bom' :
               tempRating === 3 ? 'Bom' :
               tempRating === 2 ? 'Regular' : 'Ruim'}
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTION_CHIPS.map(chip => {
                const active = selectedChips.includes(chip);
                return (
                  <button
                    key={chip}
                    onClick={() => toggleChip(chip)}
                    className="rounded-full px-3 py-1.5 transition-colors"
                    style={{
                      background: active ? '#141530' : 'hsl(var(--muted))',
                      color: active ? '#fff' : 'hsl(var(--foreground))',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            {/* Comment */}
            <textarea
              value={tempReview}
              onChange={(e) => setTempReview(e.target.value)}
              placeholder="Conte mais sobre sua experiência..."
              className="w-full rounded-xl border p-3 text-foreground placeholder:text-muted-foreground resize-none"
              style={{ borderColor: 'hsl(var(--divider))', fontSize: 'var(--text-sm)', minHeight: '90px' }}
            />

            <button
              onClick={submitReview}
              disabled={tempRating === 0}
              className="btn-primary w-full mt-4 disabled:opacity-50"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', padding: '12px' }}
            >
              Enviar avaliação
            </button>
          </div>
        </div>
      )}

      {/* Cancel Purchase Confirmation Sheet */}
      {cancelId !== null && cancelItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelId(null)} />
          <div className="relative w-full max-w-[430px] bg-background rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom">
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                <Icon name="delete" size={22} style={{ color: '#EF4444' }} />
              </div>
              <h3 className="text-foreground mb-1" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
                Excluir compra?
              </h3>
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                "{cancelItem.title}" será removida da sua lista de compras pendentes. Essa ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCancelPurchase}
                className="rounded-full py-3 w-full"
                style={{ background: '#EF4444', color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-bold)' }}
              >
                Sim, excluir
              </button>
              <button
                onClick={() => setCancelId(null)}
                className="rounded-full py-3 w-full bg-transparent"
                style={{ color: '#1A1C40', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
