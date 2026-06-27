import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

interface PersonalInfoScreenProps {
  onBack: () => void;
}

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export function PersonalInfoScreen({ onBack }: PersonalInfoScreenProps) {
  const [formData, setFormData] = useState({
    name: 'Alessandra Rabelo',
    location: 'Uberlândia, Brazil',
    email: 'alessandra@email.com',
    phone: '(34) 99999-0000',
    cpf: '',
  });

  const handleChange = (field: string, value: string) => {
    if (field === 'cpf') value = formatCPF(value);
    if (field === 'phone') value = formatPhone(value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4 py-4">
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Informações pessoais
          </h1>
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-2">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300"
              alt="Foto de perfil"
              className="w-24 h-24 rounded-full object-cover"
            />
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--primary))' }}>
              <Icon name="photo_camera" size={16} style={{ color: 'hsl(var(--secondary))' }} />
            </button>
          </div>
          <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>Alterar foto</span>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          {([
            { label: 'Nome completo', field: 'name', type: 'text', placeholder: '' },
            { label: 'Localização', field: 'location', type: 'text', placeholder: '' },
            { label: 'E-mail', field: 'email', type: 'email', placeholder: '' },
            { label: 'Telefone', field: 'phone', type: 'tel', placeholder: '' },
            { label: 'CPF', field: 'cpf', type: 'text', placeholder: '000.000.000-00' },
          ] as const).map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="block text-muted-foreground mb-1.5" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                {label}
              </label>
              <input
                type={type}
                value={formData[field as keyof typeof formData]}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors"
                style={{ fontSize: 'var(--text-base)' }}
              />
            </div>
          ))}
        </div>

        {/* Info CPF */}
        <div className="mt-3 flex items-start gap-2">
          <Icon name="info" size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
            O CPF é necessário para transações de compra e venda de roteiros.
          </span>
        </div>

        {/* Save */}
        <button
          className="btn-primary w-full mt-8"
          style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
