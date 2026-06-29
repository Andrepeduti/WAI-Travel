import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { GOAL_OPTIONS } from '@/components/auth/OnboardingFlow';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface GoalsSettingsScreenProps {
  onBack: () => void;
}

export function GoalsSettingsScreen({ onBack }: GoalsSettingsScreenProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [initial, setInitial] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) { setLoading(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select('goals')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!active) return;
      const current = Array.isArray(data?.goals) ? (data!.goals as string[]) : [];
      setSelected(current);
      setInitial(current);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user?.id]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const dirty = selected.length !== initial.length || selected.some(g => !initial.includes(g));
  const canSave = selected.length > 0 && dirty && !saving;

  const handleSave = async () => {
    if (!user?.id || !canSave) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ goals: selected })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Não foi possível salvar. Tente novamente.');
      return;
    }
    setInitial(selected);
    toast.success('Objetivos atualizados');
    onBack();
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Objetivos no WAI
          </h1>
        </div>
      </div>

      <div className="px-5 pt-2">
        <p className="text-[14px] leading-snug text-muted-foreground mb-5">
          Escolha o que melhor representa você. Isso ajuda a personalizar sua experiência.
        </p>

        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-[84px] rounded-2xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {GOAL_OPTIONS.map(({ id, emoji, title, description }) => {
              const active = selected.includes(id);
              return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggle(id)}
                  className={cn(
                    'w-full text-left rounded-2xl p-4 flex items-start gap-3 transition-all',
                    active
                      ? 'bg-[#1A1C40] shadow-[0_8px_22px_-10px_rgba(26,28,64,0.45)]'
                      : 'bg-white border border-[#0A0A0A]/8'
                  )}
                >
                  <span className="text-[22px] leading-none mt-0.5 shrink-0">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-[15px] font-bold leading-tight', active ? 'text-white' : 'text-[#0A0A0A]')}>
                      {title}
                    </p>
                    <p className={cn('mt-1 text-[13px] leading-snug', active ? 'text-white/75' : 'text-[#6B6B6B]')}>
                      {description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                      active ? 'bg-[#9DCC36] border-[#9DCC36]' : 'border-[#0A0A0A]/20 bg-transparent'
                    )}
                  >
                    {active && <Check size={12} strokeWidth={3} className="text-[#0A0A0A]" />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pt-3 bg-background"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={cn(
            'w-full h-12 rounded-full font-semibold text-[15px] transition-all',
            canSave ? 'bg-primary text-secondary active:scale-[0.99]' : 'bg-muted text-muted-foreground'
          )}
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
