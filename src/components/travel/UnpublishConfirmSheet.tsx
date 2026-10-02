import { X } from 'lucide-react';

interface UnpublishConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function UnpublishConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
}: UnpublishConfirmSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-[210] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 touch-none" />
      <div
        className="relative w-full max-h-[90dvh] bg-white rounded-t-[24px] flex flex-col"
        style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Block */}
        <div className="box-border flex flex-col justify-center items-start pt-6 px-4 pb-3 w-full h-[54px] bg-white rounded-t-[24px] shrink-0">
          <div className="flex flex-row justify-end items-center w-full h-[18px]">
            <button
              onClick={onClose}
              className="flex items-center justify-center w-[18px] h-[18px] text-[#000000]"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content Block */}
        <div className="flex flex-col items-start px-4 pt-4 pb-[34px] gap-[40px] w-full h-[362px] bg-white">
          {/* Image and Text Frame */}
          <div className="flex flex-col justify-center items-start gap-[24px] w-full">
            <img
              src="/WAI-notebook.png"
              alt="Notebook"
              className="w-[67px] h-[80px] object-contain"
            />

            <div className="flex flex-col items-start gap-2 w-full">
              <h2 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C]">
                Tem certeza que deseja excluir esta publicação?
              </h2>
              <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F]">
                Ao excluir, seu roteiro deixa de estar disponível para compra. O acesso de quem adquiriu o roteiro será mantido.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-row items-start gap-4 w-full h-[48px]">
            <button
              onClick={onClose}
              className="box-border flex flex-row justify-center items-center py-3 px-4 gap-2 flex-1 h-[48px] border border-[#141530] rounded-[16px] active:opacity-70 transition-opacity"
            >
              <span className="font-['Urbanist'] font-bold text-[16px] leading-[19px] text-[#141530]">
                Cancelar
              </span>
            </button>

            <button
              onClick={onConfirm}
              className="flex flex-row justify-center items-center py-3 px-4 gap-2 flex-1 h-[48px] bg-[#9DCC36] rounded-[16px] active:opacity-70 transition-opacity"
            >
              <span className="font-['Urbanist'] font-bold text-[16px] leading-[19px] text-[#141530]">
                Excluir
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
