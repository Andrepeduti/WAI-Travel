import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Share2, Trash2, BarChart3, Pencil, Download, EyeOff } from 'lucide-react';
import { shareItinerary } from '@/lib/shareItinerary';

interface OwnerPublishedSheetProps {
  open: boolean;
  onClose: () => void;
  tripName?: string;
  /** Marketplace dataset id — usado para gerar o link `/r/:datasetId` ao compartilhar. */
  datasetId?: number | string;
  onManageItinerary?: () => void;
  onViewSalesDashboard?: () => void;
  onUnpublish?: () => void;
  onDownloadPdf?: () => void;
  onDelete?: () => void;
}

/**
 * Bottom sheet shown when the current user owns a published itinerary
 * and opens it in the marketplace ("for sale") view via the ⋮ button.
 */
export function OwnerPublishedSheet({
  open,
  onClose,
  tripName,
  datasetId,
  onManageItinerary,
  onViewSalesDashboard,
  onUnpublish,
  onDownloadPdf,
  onDelete,
}: OwnerPublishedSheetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  const Row = ({
    icon,
    label,
    onClick,
    danger = false,
  }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 py-3 px-1 rounded-xl transition-colors ${
        danger ? 'hover:bg-destructive/10' : 'hover:bg-muted/50'
      }`}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: danger ? 'hsl(var(--destructive) / 0.1)' : '#F2F2F2' }}
      >
        {icon}
      </div>
      <span className={`text-[14px] font-medium flex-1 text-left ${danger ? 'text-destructive' : 'text-foreground'}`}>
        {label}
      </span>
      {!danger && <Icon name="chevron_right" size={18} className="text-muted-foreground" />}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={handleClose}>
        <div className="absolute inset-0 bg-black/40" style={{ animation: 'fadeIn 0.3s ease-out' }} />
        <div
          className="relative w-full w-full bg-background rounded-t-2xl"
          style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </div>

          <div className="px-5 pb-4 pt-2">
            <h3 className="text-[18px] font-bold text-foreground">Configurações</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Roteiro público — somente você vê estas opções.</p>
          </div>

          <div className="px-5 pb-6 space-y-1">
            <Row
              icon={<Pencil size={18} className="text-foreground" />}
              label="Gerenciar roteiro"
              onClick={() => { onClose(); onManageItinerary?.(); }}
            />

            <Row
              icon={<BarChart3 size={18} className="text-foreground" />}
              label="Dashboard de vendas"
              onClick={() => { onClose(); onViewSalesDashboard?.(); }}
            />

            <Row
              icon={<Share2 size={18} className="text-foreground" />}
              label="Compartilhar roteiro"
              onClick={async () => {
                await shareItinerary({ title: tripName, datasetId });
                onClose();
              }}
            />

            <Row
              icon={<Download size={18} className="text-foreground" />}
              label="Baixar em PDF"
              onClick={() => { onClose(); onDownloadPdf?.(); }}
            />

            <Row
              icon={<EyeOff size={18} className="text-foreground" />}
              label="Tornar privado"
              onClick={() => { onClose(); onUnpublish?.(); }}
            />

            <div className="pt-3 mt-2 border-t border-border">
              <Row
                icon={<Trash2 size={18} className="text-destructive" />}
                label="Excluir roteiro"
                onClick={() => setShowDeleteConfirm(true)}
                danger
              />
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/20" style={{ animation: 'fadeIn 0.2s ease-out' }} />
          <div
            className="relative w-full w-full bg-background rounded-t-2xl"
            style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
            </div>
            <div className="px-5 pt-4 pb-8 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={26} className="text-destructive" />
              </div>
              <h3 className="text-[18px] font-bold text-foreground mb-1">Excluir roteiro?</h3>
              <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
                {tripName
                  ? `"${tripName}" será excluído permanentemente. Esta ação não pode ser desfeita.`
                  : 'Este roteiro será excluído permanentemente. Esta ação não pode ser desfeita.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3.5 rounded-xl border border-border text-[14px] font-semibold text-foreground bg-card active:scale-[0.98] transition-transform"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onClose();
                    onDelete?.();
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-destructive text-destructive-foreground text-[14px] font-semibold active:scale-[0.98] transition-transform"
                >
                  Sim, excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
