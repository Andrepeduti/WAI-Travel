import { useEffect, useMemo, useState } from 'react';
import { Crown, Pencil, Eye, X, MoreHorizontal, Trash2, UserPlus, Clock } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import {
  listItineraryMembers,
  listPendingInvitesForItinerary,
  removeMember,
  updateMemberRole,
  cancelInvite,
  getItineraryOwnerProfile,
  type ItineraryMember,
  type ItineraryInvite,
} from '@/lib/itineraryMembersApi';
import { toast } from 'sonner';

interface ParticipantsSheetProps {
  open: boolean;
  onClose: () => void;
  itineraryId: string;
  currentUserId?: string;
  /** Abre o fluxo de convite existente (ShareItinerarySheet). */
  onInvite?: () => void;
}

const roleConfig = {
  owner: { label: 'Proprietário', icon: Crown, color: '#4A6B1A', bg: '#E8F5CC' },
  editor: { label: 'Editor', icon: Pencil, color: '#1E40AF', bg: '#DBEAFE' },
  viewer: { label: 'Visualizador', icon: Eye, color: '#374151', bg: '#F3F4F6' },
} as const;

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || '?').toUpperCase();
}

export function ParticipantsSheet({ open, onClose, itineraryId, currentUserId, onInvite }: ParticipantsSheetProps) {
  const [owner, setOwner] = useState<{ userId: string; name: string; avatar?: string } | null>(null);
  const [members, setMembers] = useState<ItineraryMember[]>([]);
  const [invites, setInvites] = useState<ItineraryInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMember, setActionMember] = useState<ItineraryMember | null>(null);
  const [pendingRole, setPendingRole] = useState<'editor' | 'viewer'>('viewer');
  const [savingRole, setSavingRole] = useState(false);

  // Sync pending role when opening the action sheet
  useEffect(() => {
    if (actionMember) {
      setPendingRole((actionMember.role === 'editor' ? 'editor' : 'viewer'));
    }
  }, [actionMember]);

  const isOwner = !!owner && !!currentUserId && owner.userId === currentUserId;

  useEffect(() => {
    if (!open || !itineraryId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [o, m] = await Promise.all([
          getItineraryOwnerProfile(itineraryId),
          listItineraryMembers(itineraryId),
        ]);
        if (cancelled) return;
        setOwner(o);
        setMembers(m);
        // Convites pendentes só são visíveis para o dono (RLS)
        if (o && currentUserId && o.userId === currentUserId) {
          try {
            const inv = await listPendingInvitesForItinerary(itineraryId);
            if (!cancelled) setInvites(inv);
          } catch {
            if (!cancelled) setInvites([]);
          }
        } else {
          setInvites([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, itineraryId, currentUserId]);

  const ownerRow = useMemo(() => {
    if (!owner) return null;
    return {
      kind: 'owner' as const,
      userId: owner.userId,
      name: owner.userId === currentUserId ? `${owner.name} (você)` : owner.name,
      avatar: owner.avatar,
      role: 'owner' as const,
    };
  }, [owner, currentUserId]);

  const handleSaveRole = async () => {
    if (!actionMember) return;
    if (actionMember.role === pendingRole) {
      setActionMember(null);
      return;
    }
    setSavingRole(true);
    try {
      await updateMemberRole(actionMember.id, pendingRole);
      setMembers((prev) => prev.map((m) => (m.id === actionMember.id ? { ...m, role: pendingRole } : m)));
      toast.success('Permissão alterada', { description: `${actionMember.name} agora é ${roleConfig[pendingRole].label}` });
      setActionMember(null);
    } catch {
      toast.error('Não foi possível alterar a permissão');
    } finally {
      setSavingRole(false);
    }
  };

  const handleRemove = async (member: ItineraryMember) => {
    try {
      await removeMember(member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setActionMember(null);
      toast.success('Participante removido', { description: member.name });
    } catch {
      toast.error('Não foi possível remover');
    }
  };

  const handleCancelInvite = async (invite: ItineraryInvite) => {
    try {
      await cancelInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      toast.success('Convite cancelado');
    } catch {
      toast.error('Não foi possível cancelar o convite');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[210]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300 w-full mx-auto"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-[17px] font-bold text-foreground">Participantes</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#F2F2F2' }}
          >
            <X size={18} className="text-foreground" />
          </button>
        </div>

        {/* List */}
        <div className="px-5 pb-4 overflow-y-auto flex-1 space-y-2">
          {loading && (
            <div className="py-10 text-center text-[13px] text-muted-foreground">Carregando...</div>
          )}

          {!loading && ownerRow && (
            <ParticipantRow
              name={ownerRow.name}
              avatar={ownerRow.avatar}
              role="owner"
            />
          )}

          {!loading && members.map((m) => (
            <ParticipantRow
              key={m.id}
              name={m.userId === currentUserId ? `${m.name} (você)` : m.name}
              avatar={m.avatar}
              role={m.role}
              actionable={isOwner}
              onAction={() => setActionMember(m)}
            />
          ))}

          {!loading && invites.length > 0 && (
            <div className="pt-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-2">
                Convites pendentes
              </p>
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F9FAFB] mb-2">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground truncate">
                      {inv.inviterName || 'Convite'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Aguardando resposta · {roleConfig[inv.role].label}
                    </p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleCancelInvite(inv)}
                      className="text-[12px] font-semibold text-destructive px-2 py-1 active:opacity-70"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && !ownerRow && members.length === 0 && (
            <div className="py-10 text-center text-[13px] text-muted-foreground">
              Nenhum participante encontrado
            </div>
          )}
        </div>

        {/* Footer — invite */}
        {isOwner && onInvite && (
          <div className="px-5 pt-3 pb-6 border-t border-border/40">
            <button
              onClick={() => { onClose(); setTimeout(() => onInvite(), 50); }}
              className="w-full h-[44px] rounded-2xl flex items-center justify-center gap-2 font-semibold text-[15px] active:opacity-90"
              style={{ background: '#9DCC36', color: '#141530' }}
            >
              <UserPlus size={18} strokeWidth={2.2} />
              Convidar
            </button>
          </div>
        )}
      </div>

      {/* Per-member action sheet */}
      {actionMember && (
        <div className="fixed inset-0 z-[220]" onClick={() => setActionMember(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl px-5 pt-3 pb-6 w-full mx-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-3" />
            <div className="flex items-center justify-between mb-1">
              <p className="text-[16px] font-bold text-foreground">Editar permissão</p>
              <button onClick={() => setActionMember(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
                <X size={16} className="text-foreground" />
              </button>
            </div>
            <p className="text-[13px] text-muted-foreground mb-4 truncate">{actionMember.name}</p>

            <div className="space-y-2 mb-5">
              {(['editor', 'viewer'] as const).map((r) => {
                const selected = pendingRole === r;
                const RIcon = roleConfig[r].icon;
                const description = r === 'editor'
                  ? 'Pode editar o roteiro e adicionar itens'
                  : 'Pode apenas visualizar o roteiro';
                return (
                  <button
                    key={r}
                    onClick={() => setPendingRole(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors text-left"
                    style={{
                      borderColor: selected ? '#1A1C40' : '#E5E7EB',
                      background: selected ? '#F5F7FF' : '#FFFFFF',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: roleConfig[r].bg, color: roleConfig[r].color }}
                    >
                      <RIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground">{roleConfig[r].label}</p>
                      <p className="text-[12px] text-muted-foreground leading-snug">{description}</p>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: selected ? '#1A1C40' : '#D1D5DB' }}
                    >
                      {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#1A1C40' }} />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSaveRole}
              disabled={savingRole}
              className="w-full h-[44px] rounded-2xl font-semibold text-[15px] mb-2 active:opacity-90 disabled:opacity-60"
              style={{ background: '#9DCC36', color: '#141530' }}
            >
              {savingRole ? 'Salvando...' : 'Salvar alterações'}
            </button>

            <button
              onClick={() => handleRemove(actionMember)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-medium text-destructive active:bg-destructive/10"
            >
              <Trash2 size={16} />
              Remover participante
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ParticipantRowProps {
  name: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  actionable?: boolean;
  onAction?: () => void;
}

function ParticipantRow({ name, avatar, role, actionable, onAction }: ParticipantRowProps) {
  const cfg = roleConfig[role];
  const RIcon = cfg.icon;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F9FAFB]">
      {avatar ? (
        <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-[12px] font-bold text-foreground">{getInitials(name)}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-foreground truncate">{name}</p>
        <div className="flex items-center gap-1 mt-0.5" style={{ color: cfg.color }}>
          <RIcon size={11} />
          <span className="text-[11px] font-semibold">{cfg.label}</span>
        </div>
      </div>
      {actionable && (
        <button
          onClick={onAction}
          className="w-8 h-8 rounded-full flex items-center justify-center active:bg-muted/60"
          aria-label="Mais opções"
        >
          <MoreHorizontal size={16} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
