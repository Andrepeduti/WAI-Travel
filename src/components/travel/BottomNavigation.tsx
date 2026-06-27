import { Icon } from '@/components/ui/Icon';

export type TabType = 'home' | 'explore' | 'create' | 'trips' | 'ai';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: {
  id: TabType;
  icon: string;
  label: string;
}[] = [
  { id: 'home', icon: 'home', label: 'Início' },
  { id: 'explore', icon: 'search', label: 'Explorar' },
  { id: 'trips', icon: 'map', label: 'Roteiros' },
  { id: 'create', icon: 'add', label: 'Criar' },
];

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[430px] px-4"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
    >
      <div
        className="flex items-center justify-around"
        style={{
          height: '72px',
          borderRadius: '32px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
          padding: '0 8px',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              data-tour-id={`nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] transition-all duration-200 ease-out"
              style={{
                borderRadius: '20px',
                padding: tab.label ? '6px 14px' : '6px 10px',
                background: isActive ? 'rgba(26, 28, 64, 0.12)' : 'transparent',
              }}
            >
              <Icon
                name={tab.icon}
                size={24}
                filled={isActive}
                style={{
                  color: isActive ? '#1A1C40' : '#14142f',
                }}
              />
              {tab.label && (
                <span
                  className="text-[12px] leading-none mt-[3px]"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#1A1C40' : '#14142f',
                  }}
                >
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
