import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/switch';
import { BackButton } from '@/components/ui/BackButton';

interface NotificationSettingsScreenProps {
  onBack: () => void;
}

const categories = [
  { id: 'followers', label: 'Novos seguidores', icon: 'person_add' },
  { id: 'likes', label: 'Curtidas e comentários', icon: 'favorite' },
  { id: 'sales', label: 'Vendas de roteiros', icon: 'shopping_bag' },
  { id: 'updates', label: 'Atualizações da plataforma', icon: 'campaign' },
  { id: 'reminders', label: 'Lembretes de viagem', icon: 'alarm' },
  { id: 'trip_progress', label: 'Andamento das viagens', icon: 'flight_takeoff' },
  { id: 'trip_edits', label: 'Edições nas viagens', icon: 'edit' },
  { id: 'messages', label: 'Mensagens', icon: 'chat' },
];

type Prefs = Record<string, { app: boolean; email: boolean }>;

const defaultPrefs: Prefs = Object.fromEntries(
  categories.map(c => [c.id, { app: true, email: true }])
);

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);

  const toggle = (id: string, channel: 'app' | 'email') => {
    setPrefs(prev => ({ ...prev, [id]: { ...prev[id], [channel]: !prev[id][channel] } }));
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-20 bg-background">
        <div className="relative flex items-center justify-center px-4" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} className="absolute left-4" />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Notificações
          </h1>
        </div>
      </div>

      <div className="px-5 pt-2">
        <p className="text-muted-foreground mb-5" style={{ fontSize: 'var(--text-sm)' }}>
          Escolha quais notificações deseja receber e por qual canal.
        </p>

        {/* Column headers */}
        <div className="flex items-center justify-end gap-6 mb-3 pr-1">
          <span className="text-muted-foreground w-10 text-center" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }}>App</span>
          <span className="text-muted-foreground w-10 text-center" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }}>E-mail</span>
        </div>

        <div className="space-y-1">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className="flex items-center justify-between py-3.5"
              style={{ borderBottom: idx < categories.length - 1 ? '1px solid hsl(var(--divider))' : 'none' }}
            >
              <div className="flex items-center flex-1 min-w-0">
                <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>{cat.label}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-10 flex justify-center">
                  <Switch checked={prefs[cat.id].app} onCheckedChange={() => toggle(cat.id, 'app')} />
                </div>
                <div className="w-10 flex justify-center">
                  <Switch checked={prefs[cat.id].email} onCheckedChange={() => toggle(cat.id, 'email')} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
