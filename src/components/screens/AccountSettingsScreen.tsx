import { useState } from 'react';
import { BackButton } from '@/components/ui/BackButton';
import { SettingsGroup, type SettingsRowItem } from '@/components/settings/SettingsGroup';
import { ChangeEmailSheet } from '@/components/settings/ChangeEmailSheet';
import { ChangePasswordSheet } from '@/components/settings/ChangePasswordSheet';
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog';
import { useAuth } from '@/contexts/AuthContext';

interface AccountSettingsScreenProps {
  onBack: () => void;
  onPersonalInfo: () => void;
  onBlockedUsers: () => void;
}

export function AccountSettingsScreen({ onBack, onPersonalInfo, onBlockedUsers }: AccountSettingsScreenProps) {
  const { user: authUser } = useAuth();
  const email = authUser?.email ?? '';
  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const items: SettingsRowItem[] = [
    { key: 'personal-info', icon: 'person', title: 'Informações pessoais', description: 'Nome, usuário, sobre mim e redes sociais', onClick: onPersonalInfo },
    { key: 'email', icon: 'mail', title: 'E-mail', description: email || 'Altere o e-mail da sua conta', onClick: () => setEmailOpen(true) },
    { key: 'password', icon: 'lock', title: 'Alterar senha', description: 'Defina uma nova senha de acesso', onClick: () => setPasswordOpen(true) },
    { key: 'blocked', icon: 'block', title: 'Usuários bloqueados', description: 'Gerencie quem você bloqueou', onClick: onBlockedUsers },
    { key: 'delete', icon: 'delete', title: 'Excluir conta', destructive: true, onClick: () => setDeleteOpen(true) },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-10">
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Minha conta
          </h1>
        </div>
      </div>

      <div className="px-5 pt-3">
        <SettingsGroup items={items} />
      </div>

      <ChangeEmailSheet open={emailOpen} onOpenChange={setEmailOpen} currentEmail={email} />
      <ChangePasswordSheet open={passwordOpen} onOpenChange={setPasswordOpen} email={email} />
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
