import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FriendProfileScreen, FriendProfileData } from '@/components/screens/FriendProfileScreen';
import { CreatorProgramScreen } from '@/components/screens/CreatorProgramScreen';
import { EditProfileScreen } from '@/components/screens/EditProfileScreen';
import { ChatScreen } from '@/components/screens/ChatScreen';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

type SubScreen = 'main' | 'creator-program' | 'edit' | 'chat';

const UserPage = () => {
  const navigate = useNavigate();
  const [subScreen, setSubScreen] = useState<SubScreen>('main');
  const { user, refresh, loading } = useCurrentUser();
  const { session, loading: authLoading } = useAuth();

  // Auth gate
  useEffect(() => {
    if (!authLoading && !session) navigate('/login', { replace: true });
  }, [session, authLoading, navigate]);

  // Build the FriendProfileData straight from the database-backed user.
  const currentUser: FriendProfileData = {
    userId: session?.user.id,
    name: user.name || 'Adicione seu nome',
    username: user.username || '@viajante',
    location: user.location || '',
    avatar: user.avatar || '',
    bio: user.bio || '',
    instagram: user.instagram || '',
    tiktok: user.tiktok || '',
    youtube: user.youtube || '',
    following: user.following,
    followers: user.followers > 0 ? String(user.followers) : '0',
    countries: [],
  };

  const content = (() => {
    if (subScreen === 'chat') {
      return <ChatScreen onBack={() => setSubScreen('main')} />;
    }

    if (subScreen === 'creator-program') {
      return (
        <CreatorProgramScreen
          onBack={() => setSubScreen('main')}
          onStartCreating={() => {
            setSubScreen('main');
            navigate('/home', { state: { openCreateItinerary: true } });
          }}
          onPublishExisting={(it) => {
            setSubScreen('main');
            navigate('/home', { state: { openItineraryForPublish: it } });
          }}
        />
      );
    }

    if (subScreen === 'edit') {
      return (
        <EditProfileScreen
          onBack={() => setSubScreen('main')}
          onSave={() => {
            refresh();
            setSubScreen('main');
          }}
        />
      );
    }

    return (
      <FriendProfileScreen
        variant="self"
        friend={currentUser}
        onBack={() => navigate('/home')}
        onEditProfile={() => setSubScreen('edit')}
        onCreatorProgram={() => setSubScreen('creator-program')}
        isLoading={loading}
      />
    );
  })();

  return (
    <div className="min-h-screen bg-muted flex items-start justify-center">
      <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
        {content}
      </div>
    </div>
  );
};

export default UserPage;
