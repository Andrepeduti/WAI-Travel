import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { listConversations } from '@/lib/chatApi';

export function useUnreadChatCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;

    const refresh = async () => {
      try {
        const convs = await listConversations(user.id);
        if (cancelled) return;
        setUnreadCount(convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0));
      } catch (e) {
        console.error('[useUnreadChatCount]', e);
      }
    };

    refresh();

    const channel = supabase
      .channel(`unread-chat:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_conversation_members', filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return unreadCount;
}
