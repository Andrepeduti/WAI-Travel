import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';

interface PaymentSettingsScreenProps {
  onBack: () => void;
}

const STORAGE_KEY = 'wai-travel-receiving-data';

interface ReceivingData {
  cpf: string;
  pixKey: string;
}

const loadInitial = (): ReceivingData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { cpf: '000.000.000-00', pixKey: 'email@exemplo.com' };
};

export function PaymentSettingsScreen({ onBack }: PaymentSettingsScreenProps) {
  const initial = loadInitial();
  const [savedData, setSavedData] = useState<ReceivingData>(initial);
  const [cpf, setCpf] = useState(initial.cpf);
  const [pixKey, setPixKey] = useState(initial.pixKey);
  const [isEditing, setIsEditing] = useState(false);

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const validateCpf = (value: string) => value.replace(/\D/g, '').length === 11;

  const validatePixKey = (value: string): boolean => {
    const val = value.trim();
    if (!val) return false;
    // Email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return true;
    // CPF (11 digits)
    const onlyDigits = val.replace(/\D/g, '');
    if (onlyDigits.length === 11) return true;
    // Phone (10 or 11 digits)
    if (onlyDigits.length === 10) return true;
    // Chave aleatória (>= 32 chars typically uuid-like)
    if (val.length >= 20) return true;
    return false;
  };

  const isValid = validateCpf(cpf) && validatePixKey(pixKey);

  const handleEdit = () => setIsEditing(true);

  const handleSave = () => {
    if (!isValid) return;
    const data = { cpf, pixKey };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
    setSavedData(data);
    setIsEditing(false);
    toast.success('Dados atualizados com sucesso');
  };

  const inputBase = "w-full rounded-xl border px-4 py-3 outline-none transition-all";
  const readOnlyStyle = {
    background: '#F2F2F2',
    borderColor: '#E5E7EB',
    color: '#1A1C40',
    fontSize: '16px',
  } as const;
  const editableStyle = {
    background: '#FFFFFF',
    borderColor: '#E5E7EB',
    color: '#1A1C40',
    fontSize: '16px',
  } as const;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4 py-4">
          <BackButton onClick={onBack} ariaLabel="Voltar" />
          <h1
            className="text-foreground"
            style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}
          >
            Forma de recebimento
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-2">
        {/* Descriptive text */}
        <p
          className="mb-6"
          style={{ fontSize: '13px', color: '#8E8E93', lineHeight: 1.5 }}
        >
          Aqui você gerencia os dados da conta onde vai receber o dinheiro das suas vendas no aplicativo. Todos os valores gerados com seus roteiros serão transferidos para essa conta.
        </p>

        <div className="space-y-5 transition-all duration-200">
          {/* CPF */}
          <div>
            <label
              className="block mb-1.5"
              style={{ fontSize: '14px', fontWeight: 500, color: '#1A1C40' }}
            >
              CPF
            </label>
            <input
              value={isEditing ? cpf : savedData.cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              readOnly={!isEditing}
              inputMode="numeric"
              className={inputBase}
              style={isEditing ? editableStyle : readOnlyStyle}
            />
          </div>

          {/* Pix */}
          <div>
            <label
              className="block mb-1.5"
              style={{ fontSize: '14px', fontWeight: 500, color: '#1A1C40' }}
            >
              Chave Pix
            </label>
            <input
              value={isEditing ? pixKey : savedData.pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Digite sua chave Pix"
              readOnly={!isEditing}
              className={inputBase}
              style={isEditing ? editableStyle : readOnlyStyle}
            />
          </div>
        </div>
      </div>

      {/* Fixed footer */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border z-30"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="px-5 pt-3">
          <button
            onClick={isEditing ? handleSave : handleEdit}
            disabled={isEditing && !isValid}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            {isEditing ? 'Salvar' : 'Editar'}
          </button>
        </div>
      </div>
    </div>
  );
}
