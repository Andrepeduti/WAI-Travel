import React, { useRef, useState } from 'react';
import { Plane, BedDouble, Ticket, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Reserva } from '@/components/travel/AddReservaSheet';
import type { Transporte } from '@/components/travel/AddTransporteSheet';

export type UnifiedReservaItem =
  | {
      kind: 'transporte';
      id: string;
      data: Transporte;
    }
  | {
      kind: 'hospedagem';
      id: string;
      data: Reserva;
    }
  | {
      kind: 'atividade';
      id: string;
      data: Reserva;
    };

interface ReservaCardProps {
  item: UnifiedReservaItem;
  onClick: (item: UnifiedReservaItem) => void;
  onEdit: (item: UnifiedReservaItem) => void;
  onDelete: (item: UnifiedReservaItem) => void;
}

const SWIPE_THRESHOLD = 60;

export function ReservaCard({ item, onClick, onEdit, onDelete }: ReservaCardProps) {
  const [swiped, setSwiped] = useState(false);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const formatShortDate = (date?: Date) => {
    if (!date) return '';
    return format(date, 'dd/MM', { locale: ptBR });
  };

  const renderContent = () => {
    if (item.kind === 'transporte') {
      const t = item.data;
      const originCode = t.origem.split('-')[0].split(',')[0].trim();
      const destCode = t.destino.split('-')[0].split(',')[0].trim();
      const routeText = `${originCode} <> ${destCode}`;

      const idaDateStr = t.partidaDate ? formatShortDate(t.partidaDate) : '';
      const idaTimeStr = t.partidaHora ? `${t.partidaHora}:${t.partidaMinuto || '00'}` : '';
      const voltaDateStr = t.chegadaDate ? formatShortDate(t.chegadaDate) : '';
      const voltaTimeStr = t.chegadaHora ? `${t.chegadaHora}:${t.chegadaMinuto || '00'}` : '';

      const idaSegment = idaDateStr ? `Ida: ${idaDateStr} ${idaTimeStr}`.trim() : '';
      const voltaSegment = voltaDateStr ? `Volta: ${voltaDateStr} ${voltaTimeStr}`.trim() : '';

      return {
        icon: <Plane size={24} strokeWidth={1.5} className="text-[#141530]" />,
        title: t.nome || `Viagem a ${destCode}`,
        row1Parts: [idaSegment, voltaSegment].filter(Boolean),
        row2Parts: [routeText, t.valor].filter(Boolean),
      };
    }

    if (item.kind === 'hospedagem') {
      const r = item.data;
      const inDateStr = r.checkInDate ? formatShortDate(r.checkInDate) : '';
      const inTimeStr = r.checkInHora ? `${r.checkInHora}:${r.checkInMinuto || '00'}` : '';
      const outDateStr = r.checkOutDate ? formatShortDate(r.checkOutDate) : '';
      const outTimeStr = r.checkOutHora ? `${r.checkOutHora}:${r.checkOutMinuto || '00'}` : '';

      const inSegment = inDateStr ? `${inDateStr}${inTimeStr ? ' às ' + inTimeStr : ''}` : '';
      const outSegment = outDateStr ? `${outDateStr}${outTimeStr ? ' às ' + outTimeStr : ''}` : '';

      const locationCity = r.localizacao
        ? r.localizacao.split(',')[0].trim()
        : 'New York, NY';

      return {
        icon: <BedDouble size={24} strokeWidth={1.5} className="text-[#141530]" />,
        title: r.nome || 'Hospedagem',
        row1Parts: [inSegment, outSegment].filter(Boolean),
        row2Parts: [locationCity, r.valor].filter(Boolean),
      };
    }

    // Atividade
    const r = item.data;
    const dateStr = r.atividadeDate ? formatShortDate(r.atividadeDate) : '';
    const timeStr = r.atividadeHora ? `${r.atividadeHora}:${r.atividadeMinuto || '00'}` : '';
    const activitySegment = dateStr ? `${dateStr}${timeStr ? ' às ' + timeStr : ''}` : '';

    const locationCity = r.localizacao
      ? r.localizacao.split(',')[0].trim()
      : 'New York, NY';

    return {
      icon: <Ticket size={24} strokeWidth={1.5} className="text-[#141530]" />,
      title: r.nome || 'Atividade',
      row1Parts: [activitySegment].filter(Boolean),
      row2Parts: [locationCity, r.valor].filter(Boolean),
    };
  };

  const { icon, title, row1Parts, row2Parts } = renderContent();

  return (
    <div className="relative overflow-hidden rounded-[16px]">
      {/* Swipe Actions Behind */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch z-0">
        <button
          type="button"
          onClick={() => {
            setSwiped(false);
            onEdit(item);
          }}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[#3587F2] text-white"
        >
          <Edit2 size={18} />
          <span className="text-[11px] font-semibold">Editar</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSwiped(false);
            onDelete(item);
          }}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-destructive text-white"
        >
          <Trash2 size={18} />
          <span className="text-[11px] font-semibold">Excluir</span>
        </button>
      </div>

      {/* Card Content Surface (Figma Frame 1321315986: 345px width, 113px height, padding 24px, bg #FFFFFF, border 1px #EBEBEB, radius 16px) */}
      <div
        ref={cardRef}
        onClick={() => {
          if (swiped) {
            setSwiped(false);
          } else {
            onClick(item);
          }
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
          touchCurrentX.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          touchCurrentX.current = e.touches[0].clientX;
          const diff = touchStartX.current - touchCurrentX.current;
          const el = cardRef.current;
          if (el) {
            const base = swiped ? 140 : 0;
            const offset = Math.max(0, Math.min(140, base + diff));
            el.style.transition = 'none';
            el.style.transform = `translateX(-${offset}px)`;
          }
        }}
        onTouchEnd={() => {
          const diff = touchStartX.current - touchCurrentX.current;
          const el = cardRef.current;
          if (el) el.style.transition = 'transform 0.25s ease-out';

          if (swiped) {
            setSwiped(diff < -30 ? false : true);
          } else {
            setSwiped(diff > SWIPE_THRESHOLD);
          }
        }}
        className="relative z-10 bg-white border border-[#EBEBEB] rounded-[16px] p-6 transition-transform flex items-start justify-between gap-3 select-none cursor-pointer box-border min-h-[113px]"
        style={{
          transform: swiped ? 'translateX(-140px)' : 'translateX(0)',
          transition: 'transform 0.25s ease-out',
        }}
      >
        {/* Frame 1321316428: Left Icon (24x24) + Text Column (gap 12px) */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Icon */}
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
            {icon}
          </div>

          {/* Text Column (Frame 1321316426: gap 12px) */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {/* Title: 16px semibold #141530 */}
            <h3 className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530] truncate">
              {title}
            </h3>

            {/* Frame 1321316489: 2 rows with gap 8px */}
            <div className="flex flex-col gap-1">
              {/* Row 1: 14px medium #676767 with dot separator (#B4B4B4) */}
              {row1Parts.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {row1Parts.map((part, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B4B4B4] flex-shrink-0" />
                      )}
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#676767] truncate">
                        {part}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Row 2: 14px medium #676767 with dot separator (#B4B4B4) */}
              {row2Parts.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {row2Parts.map((part, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B4B4B4] flex-shrink-0" />
                      )}
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#676767] truncate">
                        {part}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Frame: Right Chevron (20x20, color #7F7F7F) */}
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-[#7F7F7F] mt-1">
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  );
}
