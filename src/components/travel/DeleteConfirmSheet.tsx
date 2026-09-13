import { X } from 'lucide-react';

interface DeleteConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  isShared?: boolean;
}

export function DeleteConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  isShared,
}: DeleteConfirmSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={onClose}>
      <div
        className="absolute inset-0 bg-black/40"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />
      
      <div
        className="relative w-full bg-white flex flex-col"
        style={{ 
          borderRadius: '24px 24px 0px 0px',
          animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Block with X button */}
        <div className="flex flex-row justify-end items-center w-full px-4 pt-6 pb-3">
          <button onClick={onClose} className="p-1 active:opacity-50 transition-opacity">
            <X size={18} strokeWidth={2.5} color="#000000" />
          </button>
        </div>

        {/* Content Block */}
        <div className="flex flex-col items-start px-4 pt-4 pb-[34px] gap-10 w-full">
          <div className="flex flex-col items-start gap-6 w-full">
            {/* Image */}
            <div 
              className="w-[114px] h-[118px]"
              style={{
                backgroundImage: 'url(/confirm.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              }}
            />

            {/* Texts */}
            <div className="flex flex-col items-start gap-2 w-full">
              <h2 className="text-[#171F2C] font-semibold text-[24px] leading-[29px]" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                {isShared ? 'Sair deste roteiro?' : 'Tem certeza que deseja excluir este roteiro?'}
              </h2>
              <p className="text-[#7F7F7F] font-medium text-[14px] leading-[20px]" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                {description ? (
                  description
                ) : isShared ? (
                  'Você deixará de participar deste roteiro e perderá acesso às futuras atualizações feitas pelo organizador. Essa ação não excluirá o roteiro para os demais participantes.'
                ) : (
                  'Ao excluir, você não poderá mais acessar ou editar este roteiro. Essa ação não pode ser desfeita.'
                )}
              </p>
            </div>
          </div>

          {/* Buttons Block */}
          <div className="flex flex-row items-start gap-4 w-full">
            <button
              onClick={onClose}
              className="flex-1 flex flex-row justify-center items-center py-3 px-4 h-[48px] border border-[#141530] rounded-[16px] active:scale-95 transition-transform"
            >
              <span className="text-[#141530] font-bold text-[16px] leading-[19px]" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                Cancelar
              </span>
            </button>
            <button
              onClick={() => {
                onClose();
                onConfirm();
              }}
              className="flex-1 flex flex-row justify-center items-center py-3 px-4 h-[48px] bg-[#9DCC36] rounded-[16px] active:scale-95 transition-transform"
            >
              <span className="text-[#141530] font-bold text-[16px] leading-[19px]" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                {confirmText || (isShared ? 'Sair' : 'Excluir')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
