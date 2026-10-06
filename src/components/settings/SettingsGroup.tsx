import { Icon } from '@/components/ui/Icon';

export interface SettingsRowItem {
  key: string;
  icon: string;
  title: string;
  description?: string;
  destructive?: boolean;
  onClick: () => void;
}

interface SettingsGroupProps {
  items: SettingsRowItem[];
}

/** Card branco com linhas de configuração separadas por divisor (padrão das telas de configurações). */
export function SettingsGroup({ items }: SettingsGroupProps) {
  return (
    <div className="card-base px-4">
      {items.map((item, idx) => {
        const color = item.destructive ? 'hsl(var(--destructive))' : undefined;
        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className="w-full flex items-center gap-3 py-3.5 text-left"
            style={{ borderBottom: idx < items.length - 1 ? '1px solid hsl(var(--divider))' : 'none' }}
          >
            <Icon
              name={item.icon}
              size={22}
              className={item.destructive ? undefined : 'text-foreground'}
              style={{ color }}
            />
            <div className="flex-1 min-w-0">
              <span
                className={`block ${item.destructive ? '' : 'text-foreground'}`}
                style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)', color }}
              >
                {item.title}
              </span>
              {item.description && (
                <span className="block text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  {item.description}
                </span>
              )}
            </div>
            <Icon
              name="chevron_right"
              size={18}
              className={item.destructive ? undefined : 'text-muted-foreground'}
              style={{ color }}
            />
          </button>
        );
      })}
    </div>
  );
}
