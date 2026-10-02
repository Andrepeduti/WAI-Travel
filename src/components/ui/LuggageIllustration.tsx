import React from 'react';

interface LuggageIllustrationProps {
  className?: string;
  width?: number;
  height?: number;
}

export function LuggageIllustration({ className, width = 119, height = 114 }: LuggageIllustrationProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 119 114"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ilustração de malas de viagem"
    >
      {/* Sombra no chão */}
      <ellipse cx="60" cy="110" rx="46" ry="4" fill="#000000" fillOpacity="0.06" />

      {/* ─── Mala Verde Alta (Trás) ─── */}
      <g transform="translate(14, 0)">
        {/* Haste telescópica */}
        <rect x="36" y="2" width="2.5" height="26" rx="1.25" fill="#21935F" />
        <rect x="45.5" y="2" width="2.5" height="26" rx="1.25" fill="#21935F" />
        <path
          d="M35 3C35 1.5 36.5 0 38.5 0H45.5C47.5 0 49 1.5 49 3V5H35V3Z"
          fill="#3F3F3F"
        />

        {/* Rodinhas mala verde */}
        <circle cx="34" cy="104" r="3" fill="#0B5631" />
        <circle cx="56" cy="104" r="3" fill="#0B5631" />

        {/* Corpo principal da mala verde */}
        <rect
          x="28"
          y="20"
          width="36"
          height="82"
          rx="8"
          fill="#127043"
          transform="rotate(4 28 20)"
        />
        {/* Painel frontal mala verde */}
        <rect
          x="32"
          y="26"
          width="28"
          height="70"
          rx="5"
          fill="#21935F"
          transform="rotate(4 32 26)"
        />
        {/* Linhas de relevo */}
        <line x1="35" y1="40" x2="57" y2="41.5" stroke="#175E3A" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="52" x2="58" y2="53.5" stroke="#175E3A" strokeWidth="2" strokeLinecap="round" />
        <line x1="37" y1="64" x2="59" y2="65.5" stroke="#175E3A" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="76" x2="60" y2="77.5" stroke="#175E3A" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* ─── Bolsa Lateral Marrom / Terracota (Esquerda) ─── */}
      <g transform="translate(6, 42)">
        <rect x="6" y="16" width="18" height="42" rx="5" fill="#D86545" />
        <rect x="8.5" y="19" width="13" height="36" rx="3" fill="#FF7748" />
        {/* Alça */}
        <path d="M11 16V12C11 10.5 12.5 9 15 9C17.5 9 19 10.5 19 12V16" stroke="#AF4A33" strokeWidth="1.75" strokeLinecap="round" />
      </g>

      {/* ─── Mala Laranja Média Frontal ─── */}
      <g transform="translate(18, 44)">
        {/* Corpo principal */}
        <rect x="12" y="10" width="50" height="48" rx="8" fill="#DA501F" />
        {/* Painel interno */}
        <rect x="15" y="13" width="44" height="42" rx="6" fill="#FF7748" />

        {/* Alça superior da mala laranja */}
        <path
          d="M31 10V5C31 3.5 32.5 2 34.5 2H40.5C42.5 2 44 3.5 44 5V10"
          stroke="#AF4A33"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Detalhes de bolso / zíper */}
        <rect x="20" y="20" width="34" height="14" rx="3" fill="#DA501F" />
        <rect x="20" y="38" width="34" height="11" rx="3" fill="#DA501F" />
      </g>
    </svg>
  );
}
