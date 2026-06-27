import { useEffect, useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

export type ReportTargetType = 'profile' | 'itinerary';

export interface ReportReason {
  id: string;
  label: string;
  description: string;
}

const PROFILE_REASONS: ReportReason[] = [
  { id: 'spam', label: 'É spam', description: 'Conteúdo repetitivo, links suspeitos ou comportamento de bot.' },
  { id: 'nudity', label: 'Nudez ou atividade sexual', description: 'Fotos, vídeos ou descrições com conteúdo sexual explícito.' },
  { id: 'hate', label: 'Discurso de ódio ou símbolos', description: 'Ataques a pessoas com base em raça, religião, gênero, orientação ou identidade.' },
  { id: 'violence', label: 'Violência ou ameaças', description: 'Incitação à violência, ameaças ou apologia a grupos perigosos.' },
  { id: 'bullying', label: 'Bullying ou assédio', description: 'Ofensas, humilhação ou perseguição contra você ou outra pessoa.' },
  { id: 'scam', label: 'Golpe ou fraude', description: 'Tentativa de enganar, pedir dinheiro ou se passar por outra pessoa.' },
  { id: 'impersonation', label: 'Está se passando por mim ou alguém', description: 'Uso indevido de nome, foto ou identidade de outra pessoa ou marca.' },
  { id: 'ip', label: 'Propriedade intelectual', description: 'Uso não autorizado de fotos, textos ou marca registrada.' },
  { id: 'self_harm', label: 'Suicídio ou automutilação', description: 'Conteúdo que incentiva ou retrata automutilação.' },
  { id: 'illegal', label: 'Venda de produtos ilegais', description: 'Drogas, armas, fauna silvestre ou serviços ilegais.' },
  { id: 'misinfo', label: 'Informação falsa', description: 'Conteúdo enganoso que pode causar dano.' },
  { id: 'other', label: 'Outro motivo', description: 'Conte para a gente o que está acontecendo.' },
];

const ITINERARY_REASONS: ReportReason[] = [
  { id: 'spam', label: 'É spam', description: 'Conteúdo repetitivo, irrelevante ou criado para enganar a busca.' },
  { id: 'misinfo', label: 'Informação falsa ou enganosa', description: 'Lugares, preços ou horários incorretos que podem prejudicar a viagem.' },
  { id: 'offensive', label: 'Conteúdo ofensivo', description: 'Linguagem ou imagens que promovem ódio, violência ou nudez.' },
  { id: 'ip', label: 'Plágio ou propriedade intelectual', description: 'Cópia de roteiro, textos ou fotos sem autorização.' },
  { id: 'scam', label: 'Golpe ou fraude', description: 'Tentativa de enganar compradores, cobranças indevidas ou serviços que não existem.' },
  { id: 'inappropriate', label: 'Conteúdo inapropriado', description: 'Atividades ilegais, perigosas ou que violam nossas diretrizes.' },
  { id: 'other', label: 'Outro motivo', description: 'Conte para a gente o que está acontecendo.' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  /** Nome do perfil/roteiro denunciado, exibido no cabeçalho. */
  targetName?: string;
  /** Executa o envio da denúncia. Recebe o motivo selecionado + detalhes opcionais. */
  onSubmit: (payload: { reasonId: string; reasonLabel: string; details: string }) => Promise<void>;
}

/**
 * Fluxo de denúncia inspirado em Instagram/TikTok.
 * 3 passos: motivo → detalhes (opcional) → confirmação.
 */
export function ReportSheet({ open, onClose, targetType, targetName, onSubmit }: Props) {
  const [step, setStep] = useState<'reason' | 'details' | 'success'>('reason');
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasons = targetType === 'profile' ? PROFILE_REASONS : ITINERARY_REASONS;
  const subjectLabel = targetType === 'profile' ? 'este perfil' : 'este roteiro';

  useEffect(() => {
    if (!open) {
      // reset depois do fechamento
      const t = setTimeout(() => {
        setStep('reason');
        setSelected(null);
        setDetails('');
        setSubmitting(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSelectReason = (r: ReportReason) => {
    setSelected(r);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selected) return;
    if (selected.id === 'other' && details.trim().length < 5) {
      toast.error('Conte com um pouco mais de detalhe para a gente entender');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        reasonId: selected.id,
        reasonLabel: selected.label,
        details: details.trim(),
      });
      setStep('success');
    } catch (error) {
      console.error('[ReportSheet] submit failed', error);
      toast.error('Não foi possível enviar a denúncia. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cabeçalho dinâmico por passo
  const headerTitle =
    step === 'reason'
      ? 'Denunciar'
      : step === 'details'
      ? (
          <button
            type="button"
            onClick={() => setStep('reason')}
            className="flex items-center gap-1 -ml-1 text-[16px] font-semibold text-[#1A1C40]"
          >
            <Icon name="chevron_left" size={20} style={{ color: '#1A1C40' }} />
            Denunciar
          </button>
        )
      : '';

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={headerTitle}
      maxHeight={step === 'success' ? 'auto' : '85vh'}
      showClose={step !== 'success'}
    >
      {step === 'reason' && (
        <div className="pb-4">
          <div className="px-1 pt-1 pb-3">
            <p className="text-[13px] text-[#5A5C70] leading-relaxed">
              Por que você está denunciando {subjectLabel}
              {targetName ? ` de ${targetName}` : ''}? Sua denúncia é anônima — a pessoa não saberá quem reportou.
            </p>
          </div>
          <ul className="divide-y divide-[#EFEFF3]">
            {reasons.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => handleSelectReason(r)}
                  className="w-full flex items-center justify-between gap-3 py-3.5 text-left active:opacity-70"
                >
                  <span className="text-[15px] text-[#1A1C40]">{r.label}</span>
                  <Icon name="chevron_right" size={20} style={{ color: '#8E8E93' }} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'details' && selected && (
        <div className="pb-2 flex flex-col">
          <div className="pt-1 pb-4">
            <h3 className="text-[17px] font-semibold text-[#1A1C40] mb-2">{selected.label}</h3>
            <p className="text-[13px] text-[#5A5C70] leading-relaxed">{selected.description}</p>
          </div>

          <label className="text-[13px] font-medium text-[#1A1C40] mb-1.5">
            Detalhes adicionais {selected.id === 'other' ? '' : '(opcional)'}
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 500))}
            placeholder="Descreva o que aconteceu para ajudar nossa análise."
            rows={4}
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[15px] text-[#1A1C40] placeholder:text-[#9CA0B0] focus:outline-none focus:ring-2 focus:ring-[#1A1C40]/10 resize-none"
            style={{ fontSize: 16 }}
          />
          <div className="flex justify-end mt-1">
            <span className="text-[11px] text-[#8E8E93]">{details.length}/500</span>
          </div>

          <div className="rounded-xl bg-[#F2F2F2] p-3 mt-3 flex gap-2">
            <Icon name="lock" size={16} style={{ color: '#5A5C70' }} />
            <p className="text-[12px] text-[#5A5C70] leading-relaxed">
              Sua denúncia é confidencial. Analisamos o conteúdo conforme nossas diretrizes da comunidade e podemos remover ou restringir o acesso.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-12 rounded-full bg-[#1A1C40] text-white text-[15px] font-semibold mt-5 disabled:opacity-60"
          >
            {submitting ? 'Enviando…' : 'Enviar denúncia'}
          </button>
        </div>
      )}

      {step === 'success' && (
        <div className="pb-6 pt-2 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#E8F5D5] flex items-center justify-center mb-4">
            <Icon name="check" size={32} style={{ color: '#5C7A2A' }} />
          </div>
          <h3 className="text-[18px] font-semibold text-[#1A1C40] mb-2">
            Obrigado por nos avisar
          </h3>
          <p className="text-[14px] text-[#5A5C70] leading-relaxed max-w-[300px] mb-6">
            Sua denúncia foi enviada de forma anônima. Nossa equipe vai analisar e tomar as medidas necessárias conforme as diretrizes da comunidade.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-full bg-[#1A1C40] text-white text-[15px] font-semibold"
          >
            Concluído
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
