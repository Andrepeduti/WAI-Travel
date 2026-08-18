import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';

export type TabType = 'home' | 'explore' | 'create' | 'trips' | 'ai' | 'profile';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const navItems: {
  id: TabType;
  label: string;
  renderIcon: (isActive: boolean) => React.ReactNode;
}[] = [
  {
    id: 'home',
    label: 'Início',
    renderIcon: (isActive) => (
      <svg
        className="w-[22px] h-[22px] flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={isActive ? '2.3' : '1.8'}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
      </svg>
    ),
  },
  {
    id: 'explore',
    label: 'Explorar',
    renderIcon: (isActive) => (
      <svg
        className="w-[22px] h-[22px] flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={isActive ? '2.3' : '1.8'}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <polygon
          points="16 8 13.5 13.5 8 16 10.5 10.5 16 8"
          fill={isActive ? 'currentColor' : 'none'}
        />
      </svg>
    ),
  },
  {
    id: 'trips',
    label: 'Roteiros',
    renderIcon: (isActive) => (
      <svg
        className="w-[22px] h-[22px] flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={isActive ? '2.3' : '1.8'}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l6-3 6 3V6l-6-3-6 3-6-3v15l6 3z" />
        <circle cx="15" cy="11" r="2.5" />
        <path d="M17 13l2 2" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Perfil',
    renderIcon: (isActive) => (
      <svg
        className="w-[22px] h-[22px] flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={isActive ? '2.3' : '1.8'}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="9.5" r="3" fill={isActive ? 'currentColor' : 'none'} />
        <path d="M6.8 18.5c1.2-2 3.1-3 5.2-3s4 1 5.2 3" />
      </svg>
    ),
  },
];

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <nav
      className="fixed bottom-[29px] left-1/2 -translate-x-1/2 z-40 w-[358px] max-w-[calc(100vw-32px)] pointer-events-none"
    >
      <LayoutGroup id="bottom-navigation-group">
        <div
          className="flex flex-row justify-between items-center pointer-events-auto bg-[#FFFFFF] w-[358px] max-w-full h-[64px] px-[12px] py-[8px]"
          style={{
            boxShadow: '0px 8px 24px rgba(29, 41, 57, 0.121569)',
            borderRadius: '32px',
          }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                layout
                data-tour-id={`nav-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`relative flex items-center justify-center cursor-pointer select-none outline-none transition-colors h-[48px] ${
                  isActive
                    ? 'bg-[#9ecc3b] text-[#080B43] px-[16px] rounded-[24px] font-semibold'
                    : 'text-[#141530] w-[48px] rounded-full hover:bg-black/5 active:scale-95'
                }`}
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 32,
                }}
              >
                <span className="flex items-center justify-center">
                  {item.renderIcon(isActive)}
                </span>

                {isActive && (
                  <motion.span
                    layout
                    initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                    animate={{ opacity: 1, width: 'auto', marginLeft: 8 }}
                    exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="font-bold text-[14px] whitespace-nowrap overflow-hidden leading-none tracking-tight"
                    style={{ fontFamily: 'Urbanist, sans-serif' }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
