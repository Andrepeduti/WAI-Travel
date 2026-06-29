import { useState, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useCart } from '@/contexts/CartContext';
import { BackButton } from '@/components/ui/BackButton';
import { useNotifications, type AppNotification } from '@/hooks/use-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { acceptInvite, declineInvite } from '@/lib/itineraryMembersApi';
import { toast } from 'sonner';
import { NotificationListSkeleton } from '@/components/ui/LoadingShimmers';

interface Notification {
  id: number | string;
  type: 'comment' | 'save' | 'collab' | 'purchase' | 'ai' | 'trip' | 'promo' | 'cart' | 'review' | 'follow' | 'new_sale';
  actionType: 'navigate' | 'read-only' | 'collab-action';
  avatar?: string;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  text: string;
  timestamp: string;
  read: boolean;
  group: 'Hoje' | 'Ontem' | 'Esta semana' | 'Mais antigas';
  itineraryId?: number | string;
}

// No mocked notifications: only real user-specific notifications are shown.
const baseNotifications: Notification[] = [];

interface NotificationsScreenProps {
  onBack: () => void;
  onNavigateToItinerary?: (id: number) => void;
  onNavigateToSales?: () => void;
  onNavigateToAI?: () => void;
  onNavigateToTripReminders?: () => void;
  onNavigateToPromo?: () => void;
  onNavigateToCart?: () => void;
  onNavigateToPurchases?: () => void;
}

const getNotificationGroup = (createdAt: string): Notification['group'] => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays <= 7) return 'Esta semana';
  return 'Mais antigas';
};

const formatNotificationTime = (createdAt: string) => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}sem`;
};

const dbNotificationToItem = (item: AppNotification): Notification => {
  const isInvite = item.type === 'itinerary_invite';
  const isInviteAccepted = item.type === 'itinerary_invite_accepted';
  const isNewSale = item.type === 'new_itinerary_for_sale';
  const itineraryId = typeof item.metadata?.itineraryId === 'string' || typeof item.metadata?.itineraryId === 'number'
    ? (item.metadata.itineraryId as string | number)
    : undefined;
  return {
    id: item.id,
    type: isInvite || isInviteAccepted
      ? 'collab'
      : isNewSale
        ? 'new_sale'
        : (item.type === 'follow' ? 'follow' : 'ai'),
    actionType: isInvite ? 'collab-action' : (isNewSale ? 'navigate' : 'read-only'),
    avatar: typeof item.metadata?.actorAvatar === 'string' ? item.metadata.actorAvatar : undefined,
    icon: isNewSale ? 'shopping_bag' : (isInviteAccepted ? 'check_circle' : 'person_add'),
    iconBg: isNewSale ? '#F0F7E0' : '#F0F7E0',
    iconColor: '#1A1C40',
    text: item.body || item.title,
    timestamp: formatNotificationTime(item.created_at),
    read: Boolean(item.read_at),
    group: getNotificationGroup(item.created_at),
    itineraryId,
  };
};

export function NotificationsScreen({ onBack, onNavigateToItinerary, onNavigateToSales, onNavigateToAI, onNavigateToTripReminders, onNavigateToPromo, onNavigateToCart, onNavigateToPurchases }: NotificationsScreenProps) {
  const { itemCount: cartCount } = useCart();
  const { notifications: savedNotifications, markAsRead: markSavedNotificationAsRead, loading: notificationsLoading } = useNotifications();
  const { session } = useAuth();
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const [collabResponded, setCollabResponded] = useState<Record<string, 'accepted' | 'declined'>>({});

  const notifications = useMemo<Notification[]>(() => {
    const dynamic: Notification[] = [];

    if (cartCount > 0 && !dismissed['cart']) {
      dynamic.push({
        id: -1,
        type: 'cart',
        actionType: 'navigate',
        icon: 'shopping_cart',
        iconBg: '#FFE7CC',
        iconColor: '#B8651A',
        text: cartCount === 1
          ? 'Você tem 1 roteiro no carrinho aguardando pagamento.'
          : `Você tem ${cartCount} roteiros no carrinho aguardando pagamento.`,
        timestamp: 'Agora',
        read: false,
        group: 'Hoje',
      });
    }


    return [...savedNotifications.map(dbNotificationToItem), ...dynamic, ...baseNotifications].map((n) => ({
      ...n,
      read: readMap[String(n.id)] ?? n.read,
    }));
  }, [cartCount, dismissed, readMap, savedNotifications]);

  const markAsRead = (id: number | string) => {
    setReadMap((prev) => ({ ...prev, [String(id)]: true }));
    if (typeof id === 'string') markSavedNotificationAsRead(id);
  };

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);

    if (notif.actionType === 'read-only') return;

    switch (notif.type) {
      case 'collab':
        onNavigateToItinerary?.(2);
        break;
      case 'new_sale':
        if (notif.itineraryId != null) onNavigateToItinerary?.(Number(notif.itineraryId));
        break;
      case 'comment':
        onNavigateToItinerary?.(1);
        break;
      case 'purchase':
        onNavigateToSales?.();
        break;
      case 'ai':
        onNavigateToAI?.();
        break;
      case 'trip':
        onNavigateToTripReminders?.();
        break;
      case 'promo':
        onNavigateToPromo?.();
        break;
      case 'cart':
        setDismissed((prev) => ({ ...prev, cart: true }));
        onNavigateToCart?.();
        break;
      case 'review':
        setDismissed((prev) => ({ ...prev, review: true }));
        onNavigateToPurchases?.();
        break;
    }
  };

  const handleCollabAction = async (id: number | string, action: 'accepted' | 'declined') => {
    markAsRead(id);
    setCollabResponded(prev => ({ ...prev, [String(id)]: action }));
    const dbNotif = savedNotifications.find((n) => n.id === id);
    const inviteId = dbNotif?.metadata?.inviteId as string | undefined;
    if (!inviteId || !session?.user?.id) return;
    try {
      if (action === 'accepted') {
        await acceptInvite(inviteId, session.user.id);
        toast.success('Convite aceito!');
      } else {
        await declineInvite(inviteId);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao processar convite');
    }
  };

  const groups = ['Hoje', 'Ontem', 'Esta semana', 'Mais antigas'] as const;
  const hasNotifications = notifications.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background px-5 pt-safe-top pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton onClick={onBack} />
            <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Notificações</h1>
          </div>
        </div>
      </header>

      {notificationsLoading ? (
        <div className="flex-1 pt-2">
          <NotificationListSkeleton count={6} />
        </div>
      ) : hasNotifications ? (
        <div className="flex-1 pb-8">
          {groups.map((groupName) => {
            const items = notifications.filter((n) => n.group === groupName);
            if (items.length === 0) return null;
            return (
              <div key={groupName}>
                <div className="px-5 pt-safe-top pb-2">
                  <span className="text-sm font-medium text-foreground">{groupName}</span>
                </div>
                <div className="divide-y divide-[hsl(var(--divider))]">
                  {items.map((notif) => {
                    const isCollab = notif.actionType === 'collab-action';
                    const collabStatus = collabResponded[notif.id];

                    return (
                      <button
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full flex items-start gap-3 px-5 py-3.5 text-left active:bg-muted/30 transition-colors ${
                          !notif.read ? 'bg-primary/[0.04]' : ''
                        }`}
                      >
                        <div className="flex-shrink-0 relative mt-0.5">
                          {notif.avatar ? (
                            <img src={notif.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ background: notif.iconBg || '#C9E0FF' }}
                            >
                              <Icon name={notif.icon || 'notifications'} size={20} style={{ color: notif.iconColor || '#2865B6' }} />
                            </div>
                          )}
                          {!notif.read && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] leading-snug ${!notif.read ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                            {notif.text}
                          </p>
                          <span className="text-[12px] text-muted-foreground mt-0.5 block">{notif.timestamp}</span>
                          {isCollab && !collabStatus && (
                            <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCollabAction(notif.id, 'accepted'); }}
                                className="h-8 px-4 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold active:scale-95 transition-all"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCollabAction(notif.id, 'declined'); }}
                                className="h-8 px-4 rounded-full border border-border text-foreground text-[13px] font-medium active:scale-95 transition-all"
                              >
                                Recusar
                              </button>
                            </div>
                          )}
                          {isCollab && collabStatus && (
                            <span className={`text-[12px] mt-2 block font-medium ${collabStatus === 'accepted' ? 'text-violet-darker' : 'text-muted-foreground'}`}>
                              {collabStatus === 'accepted' ? 'Colaboração aceita ✓' : <><span className="text-destructive">✕</span> Colaboração recusada</>}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
            <Icon name="notifications" size={28} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Nenhuma notificação</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Toda sua atividade aparecerá aqui.
          </p>
        </div>
      )}
    </div>
  );
}
