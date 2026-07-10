import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';

interface LoginSecurityScreenProps {
  onBack: () => void;
}

const blockedUsers = [
  { id: '1', name: 'Carlos Mendes', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
  { id: '2', name: 'Julia Santos', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
];

export function LoginSecurityScreen({ onBack }: LoginSecurityScreenProps) {
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'choose' | 'confirm-delete'>('choose');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const closeDeleteSheet = () => { setShowDeleteSheet(false); setDeleteStep('choose'); setDeleteConfirmed(false); };
  const [passwords, setPasswords] = useState({ current: '', newPwd: '', confirm: '' });
  const [blocked, setBlocked] = useState(blockedUsers);


  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: showBlockedList ? '32px' : '80px' }}>
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={showBlockedList ? () => setShowBlockedList(false) : onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            {showBlockedList ? 'Pessoas bloqueadas' : 'Login e segurança'}
          </h1>
        </div>
      </div>

      <div className="px-5 pt-2">
        {showBlockedList ? (
          <div className="space-y-1">
            {blocked.length === 0 && (
              <p className="text-muted-foreground text-center py-8" style={{ fontSize: 'var(--text-sm)' }}>Nenhuma pessoa bloqueada.</p>
            )}
            {blocked.map(user => (
              <div key={user.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(var(--divider))' }}>
                <div className="flex items-center gap-3">
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                  <span className="text-foreground" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>{user.name}</span>
                </div>
                <button
                  onClick={() => setBlocked(prev => prev.filter(u => u.id !== user.id))}
                  className="text-foreground px-3 py-1.5 rounded-xl border border-border"
                  style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}
                >
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Change password */}
            <h2 className="text-foreground mb-4" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>Trocar senha</h2>
            <div className="space-y-4 mb-8">
              {([
                { label: 'Senha atual', field: 'current' },
                { label: 'Nova senha', field: 'newPwd' },
                { label: 'Confirmar nova senha', field: 'confirm' },
              ] as const).map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-muted-foreground mb-1.5" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>{label}</label>
                  <input
                    type="password"
                    value={passwords[field]}
                    onChange={(e) => setPasswords(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors"
                    style={{ fontSize: 'var(--text-base)' }}
                  />
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px mb-6" style={{ background: 'hsl(var(--divider))' }} />

            {/* Blocked users */}
            <button
              onClick={() => setShowBlockedList(true)}
              className="w-full flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                <Icon name="block" size={20} className="text-muted-foreground" />
                <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>Pessoas bloqueadas</span>
              </div>
              <Icon name="chevron_right" size={18} className="text-muted-foreground" />
            </button>

            {/* Divider */}
            <div className="h-px mt-3 mb-6" style={{ background: 'hsl(var(--divider))' }} />

            {/* Deactivate or delete account */}
            <button
              onClick={() => { setDeleteStep('choose'); setDeleteConfirmed(false); setShowDeleteSheet(true); }}
              className="w-full flex items-center gap-3 py-3"
            >
              <Icon name="delete" size={20} style={{ color: 'hsl(var(--destructive))' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'hsl(var(--destructive))' }}>Excluir conta</span>
            </button>
          </>
        )}
      </div>

      {/* Fixed footer with update button */}
      {!showBlockedList && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background border-t border-border z-30"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="px-5 pt-3">
            <button className="btn-primary w-full" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              Atualizar senha
            </button>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Account Bottom Sheet */}
      <Sheet open={showDeleteSheet} onOpenChange={(open) => { if (!open) closeDeleteSheet(); else setShowDeleteSheet(true); }}>
        <SheetContent side="bottom" className="rounded-t-[20px] px-5 pb-8 pt-3 max-w-[430px] mx-auto">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full" style={{ background: 'hsl(var(--divider))' }} />
          </div>

          {deleteStep === 'choose' ? (
            <>
              <h2 className="text-foreground mb-1" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                O que você deseja fazer com sua conta?
              </h2>
              <p className="text-muted-foreground mb-5" style={{ fontSize: 'var(--text-sm)' }}>
                Você pode desativar sua conta temporariamente ou excluí-la de forma permanente.
              </p>

              <div className="space-y-3 mb-5">
                {/* Deactivate card */}
                <button
                  onClick={closeDeleteSheet}
                  className="w-full text-left rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
                  style={{ border: '1.5px solid hsl(var(--divider))', background: 'hsl(var(--card))' }}
                >
                  <div className="flex items-start gap-3">
                    <Icon name="pause" size={22} className="text-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-foreground mb-0.5" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                        Desativar conta
                      </p>
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                        Seu perfil ficará oculto até que você faça login novamente.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Delete card */}
                <button
                  onClick={() => { setDeleteConfirmed(false); setDeleteStep('confirm-delete'); }}
                  className="w-full text-left rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
                  style={{ border: '1.5px solid hsl(var(--destructive) / 0.35)', background: 'hsl(var(--card))' }}
                >
                  <div className="flex items-start gap-3">
                    <Icon name="delete" size={22} style={{ color: 'hsl(var(--destructive))' }} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="mb-0.5" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--destructive))' }}>
                        Excluir conta
                      </p>
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                        Sua conta e seus dados serão excluídos permanentemente.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={closeDeleteSheet}
                className="btn-outline w-full"
                style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <h2 className="text-foreground mb-1" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                Excluir conta permanentemente?
              </h2>
              <p className="text-muted-foreground mb-5" style={{ fontSize: 'var(--text-sm)' }}>
                Sua conta, roteiros e coleções serão apagados. Esta ação não pode ser desfeita.
              </p>

              <label className="flex items-start gap-3 mb-5 cursor-pointer">
                <Checkbox
                  checked={deleteConfirmed}
                  onCheckedChange={(checked) => setDeleteConfirmed(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                  Entendo que todos os meus dados serão perdidos e não poderei recuperá-los.
                </span>
              </label>

              <div className="space-y-3">
                <button
                  disabled={!deleteConfirmed}
                  onClick={closeDeleteSheet}
                  className="w-full flex items-center justify-center transition-all duration-200 disabled:opacity-40"
                  style={{ height: '41px', borderRadius: 'var(--radius-button)', background: 'hsl(var(--destructive))', color: 'white', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                >
                  Excluir conta
                </button>
                <button
                  onClick={() => setDeleteStep('choose')}
                  className="btn-outline w-full"
                  style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                >
                  Voltar
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
