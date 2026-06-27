import { supabase } from '@/integrations/supabase/client';

export type ItineraryRole = 'owner' | 'editor' | 'viewer';

export interface ItineraryMember {
  id: string;
  itineraryId: string;
  userId: string;
  role: 'editor' | 'viewer';
  name: string;
  avatar?: string;
  username?: string;
  acceptedAt: string;
}

export interface ItineraryInvite {
  id: string;
  itineraryId: string;
  inviterId: string;
  inviteeUserId: string | null;
  inviteToken: string | null;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  createdAt: string;
  itineraryTitle?: string;
  inviterName?: string;
  inviterAvatar?: string;
}

/** Lista membros aceitos de um roteiro, com perfil enriquecido. */
export async function listItineraryMembers(itineraryId: string): Promise<ItineraryMember[]> {
  const { data, error } = await supabase
    .from('itinerary_members')
    .select('id, itinerary_id, user_id, role, accepted_at')
    .eq('itinerary_id', itineraryId);
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const userIds = data.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('user_id, name, username, avatar_url')
    .in('user_id', userIds);
  const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
  return data.map((m) => {
    const p = profileMap.get(m.user_id);
    return {
      id: m.id,
      itineraryId: m.itinerary_id,
      userId: m.user_id,
      role: m.role as 'editor' | 'viewer',
      name: p?.name || p?.username || 'Membro',
      avatar: p?.avatar_url || undefined,
      username: p?.username || undefined,
      acceptedAt: m.accepted_at,
    };
  });
}

/** Cria um convite direto para um usuário (gera notificação automaticamente). */
export async function inviteUserToItinerary(params: {
  itineraryId: string;
  inviterId: string;
  inviteeUserId: string;
  role: 'editor' | 'viewer';
}) {
  const { data, error } = await supabase
    .from('itinerary_invites')
    .insert({
      itinerary_id: params.itineraryId,
      inviter_id: params.inviterId,
      invitee_user_id: params.inviteeUserId,
      role: params.role,
      status: 'pending',
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Cria/recupera um convite por link compartilhável. */
export async function createShareLink(params: {
  itineraryId: string;
  inviterId: string;
  role: 'editor' | 'viewer';
}) {
  const token = crypto.randomUUID().replace(/-/g, '');
  const { data, error } = await supabase
    .from('itinerary_invites')
    .insert({
      itinerary_id: params.itineraryId,
      inviter_id: params.inviterId,
      role: params.role,
      status: 'pending',
      invite_token: token,
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return { token, invite: data };
}

/** Lista convites pendentes recebidos pelo usuário. */
export async function listPendingInvitesForUser(userId: string): Promise<ItineraryInvite[]> {
  const { data, error } = await supabase
    .from('itinerary_invites')
    .select('id, itinerary_id, inviter_id, invitee_user_id, invite_token, role, status, created_at')
    .eq('invitee_user_id', userId)
    .eq('status', 'pending');
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const itinIds = data.map((i) => i.itinerary_id);
  const inviterIds = data.map((i) => i.inviter_id);
  const [{ data: itins }, { data: profiles }] = await Promise.all([
    supabase.from('itineraries').select('id, title').in('id', itinIds),
    supabase.from('profiles_public').select('user_id, name, username, avatar_url').in('user_id', inviterIds),
  ]);
  const itinMap = new Map((itins || []).map((i) => [i.id, i]));
  const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));
  return data.map((i) => {
    const itin = itinMap.get(i.itinerary_id);
    const prof = profMap.get(i.inviter_id);
    return {
      id: i.id,
      itineraryId: i.itinerary_id,
      inviterId: i.inviter_id,
      inviteeUserId: i.invitee_user_id,
      inviteToken: i.invite_token,
      role: i.role as 'editor' | 'viewer',
      status: i.status as 'pending',
      createdAt: i.created_at,
      itineraryTitle: itin?.title || 'Roteiro',
      inviterName: prof?.name || prof?.username || 'Alguém',
      inviterAvatar: prof?.avatar_url || undefined,
    };
  });
}

/** Lista convites pendentes enviados a partir de um roteiro (apenas dono enxerga). */
export async function listPendingInvitesForItinerary(itineraryId: string): Promise<ItineraryInvite[]> {
  const { data, error } = await supabase
    .from('itinerary_invites')
    .select('id, itinerary_id, inviter_id, invitee_user_id, invite_token, role, status, created_at')
    .eq('itinerary_id', itineraryId)
    .eq('status', 'pending');
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const inviteeIds = data.map((i) => i.invitee_user_id).filter(Boolean) as string[];
  const profMap = new Map<string, any>();
  if (inviteeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('user_id, name, username, avatar_url')
      .in('user_id', inviteeIds);
    (profiles || []).forEach((p) => profMap.set(p.user_id, p));
  }
  return data.map((i) => {
    const prof = i.invitee_user_id ? profMap.get(i.invitee_user_id) : null;
    return {
      id: i.id,
      itineraryId: i.itinerary_id,
      inviterId: i.inviter_id,
      inviteeUserId: i.invitee_user_id,
      inviteToken: i.invite_token,
      role: i.role as 'editor' | 'viewer',
      status: i.status as 'pending',
      createdAt: i.created_at,
      itineraryTitle: undefined,
      inviterName: prof?.name || prof?.username || (i.invite_token ? 'Link de convite' : 'Convite'),
      inviterAvatar: prof?.avatar_url || undefined,
    };
  });
}

/** Cancela (revoga) um convite pendente — apenas dono. */
export async function cancelInvite(inviteId: string) {
  const { error } = await supabase
    .from('itinerary_invites')
    .delete()
    .eq('id', inviteId);
  if (error) throw error;
}

/** Aceita um convite: cria membership e marca convite como aceito. */
export async function acceptInvite(inviteId: string, userId: string) {
  const { data: invite, error: e1 } = await supabase
    .from('itinerary_invites')
    .select('id, itinerary_id, role, invitee_user_id, status')
    .eq('id', inviteId)
    .maybeSingle();
  if (e1) throw e1;
  if (!invite) throw new Error('Convite não encontrado');
  if (invite.invitee_user_id !== userId) throw new Error('Convite não é seu');
  if (invite.status !== 'pending') throw new Error('Convite já processado');

  // 1) Cria membership (RLS exige convite pending)
  const { error: e2 } = await supabase.from('itinerary_members').insert({
    itinerary_id: invite.itinerary_id,
    user_id: userId,
    role: invite.role,
  });
  if (e2 && !`${e2.message}`.includes('duplicate')) throw e2;

  // 2) Marca convite aceito
  const { error: e3 } = await supabase
    .from('itinerary_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId);
  if (e3) throw e3;
  return invite.itinerary_id;
}

/** Recusa convite. */
export async function declineInvite(inviteId: string) {
  const { error } = await supabase
    .from('itinerary_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId);
  if (error) throw error;
}

/** Aceita convite por link/token. */
export async function acceptInviteByToken(token: string, userId: string) {
  const { data: invite, error } = await supabase
    .from('itinerary_invites')
    .select('id, itinerary_id, role, status, invitee_user_id')
    .eq('invite_token', token)
    .maybeSingle();
  if (error) throw error;
  if (!invite) throw new Error('Link inválido ou expirado');
  if (invite.status !== 'pending') throw new Error('Convite já utilizado');

  // Se convite era aberto (sem invitee), o aceitante "reivindica"
  if (!invite.invitee_user_id) {
    await supabase
      .from('itinerary_invites')
      .update({ invitee_user_id: userId })
      .eq('id', invite.id);
  }
  return acceptInvite(invite.id, userId);
}

/** Remove membro do roteiro (apenas dono). */
export async function removeMember(memberId: string) {
  const { error } = await supabase.from('itinerary_members').delete().eq('id', memberId);
  if (error) throw error;
}

/** Atualiza role de um membro (apenas dono). */
export async function updateMemberRole(memberId: string, role: 'editor' | 'viewer') {
  const { error } = await supabase
    .from('itinerary_members')
    .update({ role })
    .eq('id', memberId);
  if (error) throw error;
}

/** Descobre meu papel num roteiro. */
export async function getMyRole(itineraryId: string, userId: string): Promise<ItineraryRole | null> {
  // Owner check
  const { data: it } = await supabase
    .from('itineraries')
    .select('user_id')
    .eq('id', itineraryId)
    .maybeSingle();
  if (it?.user_id === userId) return 'owner';

  const { data: mem } = await supabase
    .from('itinerary_members')
    .select('role')
    .eq('itinerary_id', itineraryId)
    .eq('user_id', userId)
    .maybeSingle();
  return (mem?.role as ItineraryRole | null) ?? null;
}


/** Lista roteiros dos quais sou membro (não dono). */
export async function listSharedItineraries(userId: string) {
  const { data, error } = await supabase
    .from('itinerary_members')
    .select('itinerary_id, role')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

/** Retorna o perfil do dono de um roteiro (para exibir em listas de participantes). */
export async function getItineraryOwnerProfile(itineraryId: string): Promise<{
  userId: string;
  name: string;
  avatar?: string;
  username?: string;
} | null> {
  const { data: itin, error } = await supabase
    .from('itineraries')
    .select('user_id')
    .eq('id', itineraryId)
    .maybeSingle();
  if (error || !itin) return null;
  const { data: prof } = await supabase
    .from('profiles_public')
    .select('user_id, name, username, avatar_url')
    .eq('user_id', itin.user_id)
    .maybeSingle();
  if (!prof) return { userId: itin.user_id, name: 'Dono' };
  return {
    userId: prof.user_id,
    name: prof.name || prof.username || 'Dono',
    avatar: prof.avatar_url || undefined,
    username: prof.username || undefined,
  };
}
