import React from 'react';

interface EmptyItinerariesIllustrationProps {
  className?: string;
  size?: number;
}

/**
 * Componente estrutural de ilustração de estado vazio (Empty State).
 * Estrutura preparada para receber e acomodar o SVG final do mascote balão WAI.
 */
export function EmptyItinerariesIllustration({
  className = '',
  size = 140,
}: EmptyItinerariesIllustrationProps) {
  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 160 180"
        width={size}
        height={(size * 180) / 160}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        {/* Sombra suave de base */}
        <ellipse cx="80" cy="172" rx="36" ry="6" fill="#000000" fillOpacity="0.08" />

        {/* Ponto de interrogação flutuante */}
        <g className="animate-bounce" style={{ animationDuration: '3s' }}>
          <path
            d="M102 36C103 31 107 27 113 27C118 27 122 30 122 35C122 41 116 43 114 47C113 49 113 51 113 53"
            stroke="#9ecc3b"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle cx="113" cy="62" r="2.8" fill="#9ecc3b" />
          {/* Brilhos / sparkles */}
          <path
            d="M97 29L99 31M99 29L97 31"
            stroke="#C5E86C"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Balão Corpo (Oval / Formato Balão WAI) */}
        <ellipse cx="80" cy="76" rx="38" ry="46" fill="#1A1C40" />

        {/* Listras Verdes Sicilia do Balão */}
        <path
          d="M62 42C51 52 46 66 46 80C46 95 52 108 64 117C57 106 53 92 53 79C53 65 57 52 62 42Z"
          fill="#9ecc3b"
        />
        <path
          d="M98 42C109 52 114 66 114 80C114 95 108 108 96 117C103 106 107 92 107 79C107 65 103 52 98 42Z"
          fill="#9ecc3b"
        />

        {/* Faixa / Letra 'W' no centro do balão */}
        <path
          d="M66 66L72 94L80 76L88 94L94 66"
          stroke="#9ecc3b"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cestinha / Base do Balão */}
        <rect x="69" y="122" width="22" height="12" rx="2" fill="#1A1C40" stroke="#FFFFFF" strokeWidth="1.5" />
        <line x1="74" y1="122" x2="74" y2="134" stroke="#FFFFFF" strokeWidth="1.2" />
        <line x1="80" y1="122" x2="80" y2="134" stroke="#FFFFFF" strokeWidth="1.2" />
        <line x1="86" y1="122" x2="86" y2="134" stroke="#FFFFFF" strokeWidth="1.2" />

        {/* Cabos do Balão */}
        <line x1="58" y1="114" x2="70" y2="122" stroke="#1A1C40" strokeWidth="2" strokeLinecap="round" />
        <line x1="102" y1="114" x2="90" y2="122" stroke="#1A1C40" strokeWidth="2" strokeLinecap="round" />

        {/* Pernas do mascote */}
        <path
          d="M74 146V168H66"
          stroke="#1A1C40"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M86 146V160L94 167H99"
          stroke="#1A1C40"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Braços com pose 'mão na cintura' */}
        <path
          d="M66 138L56 144L63 150"
          stroke="#1A1C40"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M94 138L104 144L97 150"
          stroke="#1A1C40"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
