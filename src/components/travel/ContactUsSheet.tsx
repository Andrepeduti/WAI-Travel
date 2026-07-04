import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';

interface ContactUsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const questionTypes = [
  'Dúvida sobre a plataforma',
  'Problemas sem solução',
  'Ajuda para vender',
  'Ajuda para comprar',
  'Outro',
];

export function ContactUsSheet({ isOpen, onClose }: ContactUsSheetProps) {
  const { user } = useCurrentUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setName((prev) => prev || user.name || '');
      setEmail((prev) => prev || user.email || '');
    }
  }, [isOpen, user]);

  const canSubmit = name.trim() && email.trim() && type && message.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    toast({
      title: 'Mensagem enviada!',
      description: 'Recebemos sua mensagem e responderemos em breve.',
    });
    setMessage('');
    setType('');
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-[20px] px-5 pb-8 pt-3 max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: 'hsl(var(--divider))' }} />
        </div>

        <h2 className="text-foreground mb-1" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
          Fale conosco
        </h2>
        <p className="text-muted-foreground mb-5" style={{ fontSize: 'var(--text-sm)' }}>
          Envie sua dúvida ou sugestão e responderemos por e-mail.
        </p>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-muted-foreground mb-1.5" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>Nome</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors"
              style={{ fontSize: 'var(--text-base)' }}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-muted-foreground mb-1.5" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>E-mail</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors"
              style={{ fontSize: 'var(--text-base)' }}
            />
          </div>

          {/* Type of question */}
          <div className="relative">
            <label className="block text-muted-foreground mb-1.5" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>Tipo de questão</label>
            <button
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left flex items-center justify-between"
              style={{ fontSize: 'var(--text-base)', color: type ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}
            >
              {type || 'Selecione uma opção'}
              <Icon name="expand_more" size={18} className="text-muted-foreground" />
            </button>
            {showTypeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                {questionTypes.map(qt => (
                  <button
                    key={qt}
                    onClick={() => { setType(qt); setShowTypeDropdown(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors text-foreground"
                    style={{ fontSize: 'var(--text-sm)', borderBottom: '1px solid hsl(var(--divider))' }}
                  >
                    {qt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-muted-foreground mb-1.5" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>Mensagem</label>
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Descreva sua dúvida ou sugestão..."
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors resize-none"
              style={{ fontSize: 'var(--text-base)' }}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary w-full mt-6 disabled:opacity-50"
          style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
        >
          Enviar
        </button>
      </SheetContent>
    </Sheet>
  );
}
