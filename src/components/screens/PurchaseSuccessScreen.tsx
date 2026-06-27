import { useEffect, useState } from 'react';
import { Plane } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';

interface PurchaseSuccessScreenProps {
  itineraryTitle: string;
  onViewItinerary: () => void;
  onClose: () => void;
}

export function PurchaseSuccessScreen({ itineraryTitle, onViewItinerary, onClose }: PurchaseSuccessScreenProps) {
  // Phases:
  // 'initial' — nothing yet
  // 'orbit'   — plane flies around drawing a green circle
  // 'fill'    — green circle expands to fill the whole screen
  // 'check'   — circle turns white, check appears in green inside it
  // 'reveal'  — text + buttons appear
  const [phase, setPhase] = useState<'initial' | 'orbit' | 'fill' | 'check' | 'reveal'>('initial');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('orbit'), 200);
    const t2 = setTimeout(() => setPhase('fill'), 2000); // after one full loop
    const t3 = setTimeout(() => setPhase('check'), 2750); // after fill
    const t4 = setTimeout(() => setPhase('reveal'), 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const isOrbiting = phase === 'orbit' || phase === 'fill' || phase === 'check' || phase === 'reveal';
  const drewOrbit = isOrbiting;
  const isFilled = phase === 'fill' || phase === 'check' || phase === 'reveal';
  const isCheckPhase = phase === 'check' || phase === 'reveal';
  const showContent = phase === 'reveal';

  const STAGE = 200;
  const CENTER = STAGE / 2;
  const RADIUS = 70;

  // Orbit path — full circle starting at the top, clockwise
  const ORBIT_PATH = `M ${CENTER} ${CENTER - RADIUS}
    a ${RADIUS} ${RADIUS} 0 1 1 0 ${RADIUS * 2}
    a ${RADIUS} ${RADIUS} 0 1 1 0 ${-RADIUS * 2} Z`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#00000020' }}>
      <div className="w-full max-w-[430px] h-[100dvh] flex flex-col items-center justify-center px-8 text-center mx-auto relative overflow-hidden shadow-2xl" style={{ background: '#7aad2a' }}>
        {/* Expanding green that takes over the whole screen */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: RADIUS * 2,
            height: RADIUS * 2,
            background: '#6FA022',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${isFilled ? 12 : 0})`,
            opacity: isFilled ? 1 : 0,
            transition: 'transform 0.75s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.3s ease-out',
          }}
        />

        {/* Flight stage */}
        <div
          className="relative z-10 mb-10 flex items-center justify-center"
          style={{ width: STAGE, height: STAGE }}
        >
          <svg
            className="absolute inset-0"
            width={STAGE}
            height={STAGE}
            viewBox={`0 0 ${STAGE} ${STAGE}`}
            style={{ overflow: 'visible' }}
          >
            <defs>
              <path id="orbitPath" d={ORBIT_PATH} />
            </defs>

            {/* The green circle being drawn by the plane (fades out when fill takes over) */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="#9DCC36"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * RADIUS}
              strokeDashoffset={drewOrbit ? 0 : 2 * Math.PI * RADIUS}
              style={{
                transition: drewOrbit
                  ? 'stroke-dashoffset 1.7s cubic-bezier(0.45, 0, 0.55, 1), opacity 0.3s ease-out'
                  : 'none',
                opacity: isFilled ? 0 : 1,
                transformOrigin: 'center',
                transform: 'rotate(-90deg)',
              }}
            />

            {/* White circle revealed inside the green background */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="#ffffff"
              style={{
                opacity: isCheckPhase ? 1 : 0,
                transformOrigin: 'center',
                transform: isCheckPhase ? 'scale(1)' : 'scale(0.6)',
                transition: 'opacity 0.4s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />

            {/* Plane following the orbit (hidden once the fill starts) */}
            <g
              style={{
                opacity: isFilled ? 0 : 1,
                transition: 'opacity 0.25s ease-out',
              }}
            >
              <g transform="translate(-12, -12)">
                <foreignObject width="24" height="24">
                  <Plane
                    size={24}
                    color="#9DCC36"
                    strokeWidth={2.2}
                    fill="#9DCC36"
                    style={{ transform: 'rotate(45deg)' }}
                  />
                </foreignObject>
              </g>
              {isOrbiting && (
                <animateMotion
                  dur="1.7s"
                  begin="0s"
                  fill="freeze"
                  rotate="auto"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.45 0 0.55 1"
                >
                  <mpath href="#orbitPath" />
                </animateMotion>
              )}
            </g>
          </svg>

          {/* Green check inside the white circle */}
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9DCC36"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute"
            style={{
              strokeDasharray: 30,
              strokeDashoffset: isCheckPhase ? 0 : 30,
              opacity: isCheckPhase ? 1 : 0,
              transition: 'stroke-dashoffset 0.5s ease-out 0.2s, opacity 0.3s ease-out 0.15s',
            }}
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Text content */}
        <div
          className="relative z-10 transition-all duration-500 ease-out"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? 'translateY(0)' : 'translateY(16px)',
          }}
        >
          <h1 className="text-[28px] font-bold mb-2 tracking-tight" style={{ color: '#FFFFFF' }}>
            Compra realizada!
          </h1>
          <p
            className="text-[14px] mb-10 max-w-[280px] mx-auto leading-relaxed"
            style={{ color: '#FFFFFF' }}
          >
            Seu roteiro <span className="font-semibold" style={{ color: '#FFFFFF' }}>{itineraryTitle}</span> está pronto pra você explorar.
          </p>
        </div>

        {/* Buttons */}
        <div
          className="relative z-10 w-full space-y-3 transition-all duration-500 ease-out"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '0.15s',
          }}
        >
          <button
            onClick={onViewItinerary}
            className="w-full h-14 rounded-2xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: '#1A1C40', color: '#FFFFFF' }}
          >
            <Icon name="map" size={20} style={{ color: '#FFFFFF' }} />
            Ver meu roteiro
          </button>
          <button
            onClick={onClose}
            className="w-full h-14 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]"
            style={{ background: 'transparent', color: '#1A1C40', border: '2px solid #1A1C40' }}
          >
            Voltar ao início
          </button>
        </div>
      </div>
    </div>
  );
}
