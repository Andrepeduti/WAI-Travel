import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

interface LanguageScreenProps {
  onBack: () => void;
}

const languages = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export function LanguageScreen({ onBack }: LanguageScreenProps) {
  const [selected, setSelected] = useState('pt');

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Idioma
          </h1>
        </div>
      </div>

      <div className="px-5 pt-4">
        <div className="space-y-1">
          {languages.map((lang, idx) => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className="w-full flex items-center justify-between py-4"
              style={{ borderBottom: idx < languages.length - 1 ? '1px solid hsl(var(--divider))' : 'none' }}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '20px' }}>{lang.flag}</span>
                <span className="text-foreground" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>{lang.label}</span>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: selected === lang.code ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                }}
              >
                {selected === lang.code && (
                  <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
