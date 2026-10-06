import { Icon } from '@/components/ui/Icon';

interface HomeSectionHeaderProps {
  title: string;
  /** Quando informado, o título vira um link "ver todos" com chevron. */
  onClick?: () => void;
}

export function HomeSectionHeader({ title, onClick }: HomeSectionHeaderProps) {
  if (!onClick) {
    return <h2 className="text-[16px] font-semibold text-[#141530]">{title}</h2>;
  }
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 self-start">
      <h2 className="text-[16px] font-semibold text-[#141530]">{title}</h2>
      <Icon name="chevron_right" size={20} className="text-[#141530]" />
    </button>
  );
}
