interface RankBadgeProps {
  rank: 1 | 2 | 3;
  size?: number;
}

export function RankBadge({ rank, size = 28 }: RankBadgeProps) {
  if (rank === 1) {
    // Gold shield
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4C4 2.89543 4.89543 2 6 2H22C23.1046 2 24 2.89543 24 4V18C24 20.2091 22.6569 22.2091 20.8284 23.6569L14 28L7.17157 23.6569C5.34315 22.2091 4 20.2091 4 18V4Z" fill="url(#gold_main)" />
        <path d="M4 4C4 2.89543 4.89543 2 6 2H22C23.1046 2 24 2.89543 24 4V18C24 20.2091 22.6569 22.2091 20.8284 23.6569L14 28L7.17157 23.6569C5.34315 22.2091 4 20.2091 4 18V4Z" fill="url(#gold_shine)" fillOpacity="0.4" />
        <path d="M14 8L15.8 11.6L19.8 12.2L16.9 15L17.6 19L14 17.1L10.4 19L11.1 15L8.2 12.2L12.2 11.6L14 8Z" fill="white" fillOpacity="0.95" />
        <defs>
          <linearGradient id="gold_main" x1="14" y1="2" x2="14" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F0C85A" />
            <stop offset="1" stopColor="#C4943A" />
          </linearGradient>
          <linearGradient id="gold_shine" x1="8" y1="2" x2="20" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF5D0" />
            <stop offset="1" stopColor="#F0C85A" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (rank === 2) {
    // Silver diamond
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="14" y="1" width="18" height="18" rx="3" transform="rotate(45 14 1)" fill="url(#silver_main)" />
        <rect x="14" y="1" width="18" height="18" rx="3" transform="rotate(45 14 1)" fill="url(#silver_shine)" fillOpacity="0.35" />
        <path d="M14 8L15.8 11.6L19.8 12.2L16.9 15L17.6 19L14 17.1L10.4 19L11.1 15L8.2 12.2L12.2 11.6L14 8Z" fill="white" fillOpacity="0.95" />
        <defs>
          <linearGradient id="silver_main" x1="23" y1="1" x2="23" y2="19" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C5CED8" />
            <stop offset="1" stopColor="#8A98A8" />
          </linearGradient>
          <linearGradient id="silver_shine" x1="18" y1="1" x2="28" y2="12" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E8EEF4" />
            <stop offset="1" stopColor="#A0ADB8" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Bronze pentagon
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2L25 9.5L20.8 22H7.2L3 9.5L14 2Z" fill="url(#bronze_main)" />
      <path d="M14 2L25 9.5L20.8 22H7.2L3 9.5L14 2Z" fill="url(#bronze_shine)" fillOpacity="0.35" />
      <path d="M14 8L15.8 11.6L19.8 12.2L16.9 15L17.6 19L14 17.1L10.4 19L11.1 15L8.2 12.2L12.2 11.6L14 8Z" fill="white" fillOpacity="0.95" />
      <defs>
        <linearGradient id="bronze_main" x1="14" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0C88A" />
          <stop offset="1" stopColor="#C48A40" />
        </linearGradient>
        <linearGradient id="bronze_shine" x1="8" y1="2" x2="20" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE8C8" />
          <stop offset="1" stopColor="#D4A060" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
