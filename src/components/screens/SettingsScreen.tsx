import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsGroup, type SettingsRowItem } from '@/components/settings/SettingsGroup';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAuth } from '@/contexts/AuthContext';

interface SettingsScreenProps {
  onBack: () => void;
  onEditProfile: () => void;
  /** Abre uma sub-tela de configurações (chave do `ProfileSubScreen`). */
  onNavigate: (key: string) => void;
}

export function SettingsScreen({ onBack, onEditProfile, onNavigate }: SettingsScreenProps) {
  const { user, loading } = useCurrentUser();
  const { signOut } = useAuth();

  const comingSoon = () => toast.info('Em breve');

  const mainItems: SettingsRowItem[] = [
    { key: 'account', icon: 'person', title: 'Minha conta', description: 'Gerencie suas informações pessoais', onClick: () => onNavigate('account') },
    { key: 'notifications', icon: 'notifications', title: 'Notificações', description: 'Selecione quais tipos de notificação você deseja receber', onClick: () => onNavigate('notification-settings') },
    { key: 'subscription', icon: 'workspace_premium', title: 'Assinatura', description: 'Gerencie ou contrate um plano', onClick: () => onNavigate('subscription') },
    { key: 'payout', icon: 'credit_card', title: 'Conta para recebimento', description: 'Cadastre a conta onde deseja receber seus resgates', onClick: () => onNavigate('payment-settings') },
    { key: 'purchases', icon: 'shopping_bag', title: 'Histórico de compras', description: 'Acesse todas as suas compras e pendências de avaliação', onClick: () => onNavigate('purchases') },
  ];

  const supportItems: SettingsRowItem[] = [
    { key: 'help', icon: 'help', title: 'Ajuda', description: 'Encontre respostas e fale com o suporte', onClick: () => onNavigate('help-center') },
    { key: 'invite', icon: 'person_add', title: 'Indique um amigo', description: 'Convide amigos e ganhe benefícios', onClick: comingSoon },
    { key: 'rate', icon: 'star', title: 'Avalie o WAI', description: 'Sua opinião ajuda a gente a melhorar o aplicativo', onClick: comingSoon },
    { key: 'privacy', icon: 'privacy_tip', title: 'Política de privacidade', description: 'Conheça como seus dados são usados e protegidos', onClick: comingSoon },
    { key: 'sign-out', icon: 'logout', title: 'Sair da conta', destructive: true, onClick: () => { void signOut(); } },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-10">
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Configurações
          </h1>
        </div>
      </div>

      <div className="px-5 pt-3 space-y-4">
        <button type="button" onClick={onEditProfile} className="card-base w-full p-4 flex items-center gap-3 text-left">
          {loading ? (
            <>
              <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </>
          ) : (
            <>
              <UserAvatar src={user.avatar} alt={user.name || 'Seu perfil'} size={64} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-foreground truncate" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  {user.name || 'Seu nome'}
                </span>
                {user.username && (
                  <span className="block text-muted-foreground truncate" style={{ fontSize: 'var(--text-sm)' }}>
                    @{user.username}
                  </span>
                )}
              </div>
            </>
          )}
          <Icon name="chevron_right" size={18} className="text-muted-foreground flex-shrink-0" />
        </button>

        <SettingsGroup items={mainItems} />
        <SettingsGroup items={supportItems} />
      </div>
    </div>
  );
}
