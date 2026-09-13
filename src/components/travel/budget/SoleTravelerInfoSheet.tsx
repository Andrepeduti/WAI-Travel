import React from 'react';
import { X } from 'lucide-react';

interface SoleTravelerInfoSheetProps {
  open: boolean;
  onClose: () => void;
  onInvite: () => void;
}

export function SoleTravelerInfoSheet({
  open,
  onClose,
  onInvite,
}: SoleTravelerInfoSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div
        className="relative w-full max-w-lg bg-[#FFFFFF] rounded-t-[32px] p-6 pb-8 animate-in slide-in-from-bottom duration-300 shadow-2xl flex flex-col items-start"
        style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)', minHeight: '450px' }}
      >
        <div className="w-full flex justify-end mb-4">
          <button
            type="button"
            onClick={onClose}
            className="text-[#171F2C]"
          >
            <X size={24} />
          </button>
        </div>

        {/* Mascot placeholder - user can replace the src if they have the exact asset */}
        <div className="mb-6 flex justify-start w-full">
           <img 
             src="/empty-mascot.png" 
             alt="Mascot" 
             className="w-[120px] h-auto object-contain" 
             onError={(e) => { 
               e.currentTarget.style.display = 'none'; 
               // Fallback visually if image is missing
               const parent = e.currentTarget.parentElement;
               if(parent) {
                 parent.innerHTML = '<div style="width: 120px; height: 120px; border-radius: 60px; background: #F3F3F3; display: flex; align-items: center; justify-content: center; font-size: 40px;">🎈</div>';
               }
             }} 
           />
        </div>

        <h3 className="text-[22px] font-bold text-[#141530] leading-tight mb-3">
          Você ainda não tem ninguém<br/>nesta viagem
        </h3>
        <p className="text-[14px] text-[#7F7F7F] mb-auto leading-relaxed">
          Convide outros viajantes para compartilhar os gastos e<br/>o roteiro.
        </p>

        <div className="flex gap-4 w-full mt-8">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-[16px] border border-[#141530] text-[#141530] font-bold text-[16px] flex items-center justify-center transition-active active:scale-95"
          >
            Voltar
          </button>
          <button
            onClick={() => {
              onClose();
              onInvite();
            }}
            className="flex-1 h-12 rounded-[16px] bg-[#9DCC36] text-[#141530] font-bold text-[16px] flex items-center justify-center transition-active active:scale-95"
          >
            Convidar
          </button>
        </div>
      </div>
    </div>
  );
}
