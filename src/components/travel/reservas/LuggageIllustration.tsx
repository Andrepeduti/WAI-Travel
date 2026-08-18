import React from 'react';

interface LuggageIllustrationProps {
  className?: string;
  width?: number;
  height?: number;
}

export function LuggageIllustration({
  className = '',
  width = 120,
  height = 114,
}: LuggageIllustrationProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <svg
        viewBox="0 0 120 114"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        {/* Ground shadow */}
        <ellipse cx="60" cy="108" rx="46" ry="5" fill="#000000" fillOpacity="0.05" />

        {/* --- Green Suitcase (Standing on the Right) --- */}
        {/* Telescopic Handle */}
        <path
          d="M62 48V8C62 5.8 63.8 4 66 4H74C76.2 4 78 5.8 78 8V48"
          stroke="#3F3F3F"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect x="63" y="3" width="14" height="4" rx="2" fill="#3F3F3F" />

        {/* Green Suitcase Body with slight tilt */}
        <g transform="rotate(4 72 72)">
          {/* Base outer */}
          <rect x="56" y="44" width="34" height="60" rx="8" fill="#127043" />
          {/* Inner panel */}
          <rect x="59" y="48" width="28" height="52" rx="6" fill="#21935F" />
          {/* Darker accent / stripes */}
          <rect x="71" y="46" width="3" height="56" fill="#175E3A" />
          {/* Orange tag */}
          <circle cx="77" cy="60" r="2.5" fill="#DA501F" />
          {/* Wheels */}
          <circle cx="61" cy="105" r="3" fill="#0B5631" />
          <circle cx="85" cy="105" r="3" fill="#0B5631" />
        </g>

        {/* --- Red/Orange Suitcases Group (Group 8 on the Left) --- */}
        {/* Small Red Suitcase (Left vertical) */}
        <rect x="18" y="66" width="14" height="38" rx="4" fill="#AF4A33" />
        <rect x="20" y="69" width="10" height="32" rx="2.5" fill="#DA501F" />
        {/* Handle */}
        <path
          d="M23 66V63C23 62 24 61 25 61H25.5C26.5 61 27.5 62 27.5 63V66"
          stroke="#AF4A33"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Orange Horizontal Suitcase (Middle) */}
        <rect x="28" y="64" width="44" height="40" rx="7" fill="#DA501F" />
        <rect x="31" y="67" width="38" height="34" rx="5" fill="#FF7748" />
        {/* Front pocket */}
        <rect x="30" y="79" width="40" height="22" rx="4" fill="#D86545" />
        {/* Handle */}
        <path
          d="M44 64V60C44 58.5 45.5 57.5 47 57.5H53C54.5 57.5 56 58.5 56 60V64"
          stroke="#AF4A33"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Tag on orange suitcase */}
        <rect
          x="58"
          y="62"
          width="5"
          height="8"
          rx="1"
          fill="#FFFFFF"
          transform="rotate(12 58 62)"
        />
      </svg>
    </div>
  );
}
