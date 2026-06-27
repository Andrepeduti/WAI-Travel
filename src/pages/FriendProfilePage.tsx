import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ChatScreen } from '@/components/screens/ChatScreen';
import { FriendProfileScreen, FriendProfileData } from '@/components/screens/FriendProfileScreen';
import { getProfileByUsername, getProfileByUserId } from '@/lib/profilesApi';

const FriendProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ username?: string }>();
  const [showChat, setShowChat] = useState(false);

  const passedFriend = (location.state as { friend?: Partial<FriendProfileData> } | null)?.friend;

  // Se um payload mínimo foi passado pelo router state, usamos como
  // valor inicial enquanto a versão real é carregada do backend.
  const seed: FriendProfileData | null = passedFriend
    ? {
        userId: passedFriend.userId,
        name: passedFriend.name || 'Viajante',
        username: passedFriend.username || '@viajante',
        location: passedFriend.location || '',
        avatar: passedFriend.avatar || '',
        bio: passedFriend.bio || '',
        following: passedFriend.following ?? 0,
        followers: passedFriend.followers ?? '0',
        countries: passedFriend.countries ?? [],
      }
    : null;

  const [friend, setFriend] = useState<FriendProfileData | null>(seed);
  const [loading, setLoading] = useState(!seed);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setNotFound(false);
      // Prioridade: 1) param de URL :username  2) userId no state  3) username no state
      const usernameFromUrl = params.username?.trim();
      const userIdFromState = passedFriend?.userId;
      const usernameFromState = passedFriend?.username?.replace(/^@/, '');

      let result: FriendProfileData | null = null;
      if (usernameFromUrl) {
        result = await getProfileByUsername(usernameFromUrl);
      } else if (userIdFromState) {
        result = await getProfileByUserId(userIdFromState);
      } else if (usernameFromState) {
        result = await getProfileByUsername(usernameFromState);
      }

      if (cancelled) return;
      if (result) {
        setFriend(result);
      } else if (!seed) {
        setNotFound(true);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.username, passedFriend?.userId, passedFriend?.username]);

  if (showChat) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <ChatScreen onBack={() => setShowChat(false)} />
        </div>
      </div>
    );
  }

  if (loading && !friend) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Carregando perfil…</span>
        </div>
      </div>
    );
  }

  if (notFound || !friend) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl flex flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="text-base font-semibold text-foreground">Perfil não encontrado</span>
          <span className="text-sm text-muted-foreground">Esse usuário pode ter saído do app.</span>
          <button
            onClick={() => navigate('/home')}
            className="mt-2 text-sm font-medium text-primary"
          >
            Voltar para o início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-start justify-center">
      <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
        <FriendProfileScreen
          friend={friend}
          onBack={() => navigate(-1)}
          onChat={() => setShowChat(true)}
        />
      </div>
    </div>
  );
};

export default FriendProfilePage;
