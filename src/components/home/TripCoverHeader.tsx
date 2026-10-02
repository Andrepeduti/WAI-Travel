import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TripCoverHeaderProps {
  image?: string;
  title: string;
  subtitle: ReactNode;
  tag: { label: string; className: string };
  onClick?: () => void;
}

/** Topo com foto dos cards de viagem em andamento / concluída. */
export function TripCoverHeader({ image, title, subtitle, tag, onClick }: TripCoverHeaderProps) {
  return (
    <button type="button" onClick={onClick} className="relative w-full h-[151px] overflow-hidden text-left bg-[#141530]">
      {image && <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />
      <span className={cn('absolute left-4 top-4 h-7 px-3 rounded-[9px] inline-flex items-center text-[14px] font-medium', tag.className)}>
        {tag.label}
      </span>
      <div className="absolute inset-x-4 bottom-4 flex flex-col gap-1 text-white">
        <h3 className="text-[22px] leading-tight font-bold truncate">{title}</h3>
        <div className="text-[14px] text-white/80 truncate">{subtitle}</div>
      </div>
    </button>
  );
}
