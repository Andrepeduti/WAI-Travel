import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { EditTransportSheet, TransportData } from './EditTransportSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Navigation, ArrowRightLeft, Trash2, Pencil, Footprints, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export interface Activity {
  id: number;
  type?: 'activity' | 'note';
  startTime?: string;
  endTime?: string;
  category: string;
  categoryColor?: string;
  name: string;
  image: string;
  openHours?: string;
  rating?: number;
  price?: string;
  noteText?: string;
  observation?: string;
  lat?: number;
  lng?: number;
  city?: string;
  country?: string;
  personalNote?: string;
}

export interface TransportBetween {
  type: 'walk' | 'bus' | 'metro' | 'car';
  duration: string;
  cost?: string;
  distance?: string;
}

export interface DragState {
  isDragging: boolean;
  activity: Activity | null;
  sourceDay: number | null;
  sourceIndex: number | null;
  targetDay: number | null;
  targetIndex: number | null;
  pointerPos: { x: number; y: number };
  dragOffset: { x: number; y: number };
  cardWidth: number;
}

const CITY_TO_COUNTRY: Record<string, string> = {
  // Europa
  paris: 'França',
  frança: 'França',
  franca: 'França',
  nice: 'França',
  lyon: 'França',
  marseille: 'França',
  bordeaux: 'França',
  roma: 'Itália',
  rome: 'Itália',
  itália: 'Itália',
  italia: 'Itália',
  veneza: 'Itália',
  venice: 'Itália',
  florença: 'Itália',
  florence: 'Itália',
  milao: 'Itália',
  milão: 'Itália',
  milan: 'Itália',
  napoles: 'Itália',
  nápoles: 'Itália',
  pisa: 'Itália',
  londres: 'Reino Unido',
  london: 'Reino Unido',
  inglaterra: 'Reino Unido',
  edimburgo: 'Reino Unido',
  edinburgh: 'Reino Unido',
  manchester: 'Reino Unido',
  amsterdam: 'Países Baixos',
  holanda: 'Países Baixos',
  roterdam: 'Países Baixos',
  lisboa: 'Portugal',
  lisbon: 'Portugal',
  porto: 'Portugal',
  portugal: 'Portugal',
  sintra: 'Portugal',
  algarve: 'Portugal',
  madri: 'Espanha',
  madrid: 'Espanha',
  barcelona: 'Espanha',
  espanha: 'Espanha',
  sevilha: 'Espanha',
  sevilla: 'Espanha',
  valencia: 'Espanha',
  valência: 'Espanha',
  berlim: 'Alemanha',
  berlin: 'Alemanha',
  alemanha: 'Alemanha',
  munique: 'Alemanha',
  munich: 'Alemanha',
  frankfurt: 'Alemanha',
  hamburgo: 'Alemanha',
  viena: 'Áustria',
  vienna: 'Áustria',
  austria: 'Áustria',
  áustria: 'Áustria',
  salzburgo: 'Áustria',
  praga: 'República Tcheca',
  prague: 'República Tcheca',
  atenas: 'Grécia',
  athens: 'Grécia',
  grecia: 'Grécia',
  grécia: 'Grécia',
  santorini: 'Grécia',
  mykonos: 'Grécia',
  bruxelas: 'Bélgica',
  brussels: 'Bélgica',
  bruges: 'Bélgica',
  dublin: 'Irlanda',
  irlanda: 'Irlanda',
  zurique: 'Suíça',
  zurich: 'Suíça',
  genebra: 'Suíça',
  geneva: 'Suíça',
  suíça: 'Suíça',
  suica: 'Suíça',
  budapeste: 'Hungria',
  budapest: 'Hungria',
  varsovia: 'Polônia',
  varsóvia: 'Polônia',
  cracovia: 'Polônia',
  cracóvia: 'Polônia',
  estocolmo: 'Suécia',
  oslo: 'Noruega',
  copenhague: 'Dinamarca',
  copenhagen: 'Dinamarca',
  helsinki: 'Finlândia',
  istambul: 'Turquia',
  turquia: 'Turquia',

  // Américas
  'nova york': 'Estados Unidos',
  'new york': 'Estados Unidos',
  eua: 'Estados Unidos',
  usa: 'Estados Unidos',
  orlando: 'Estados Unidos',
  miami: 'Estados Unidos',
  'los angeles': 'Estados Unidos',
  'san francisco': 'Estados Unidos',
  'las vegas': 'Estados Unidos',
  chicago: 'Estados Unidos',
  toronto: 'Canadá',
  vancouver: 'Canadá',
  montreal: 'Canadá',
  canada: 'Canadá',
  canadá: 'Canadá',
  mexico: 'México',
  méxico: 'México',
  cancun: 'México',
  cancún: 'México',
  'cidade do méxico': 'México',
  'buenos aires': 'Argentina',
  argentina: 'Argentina',
  bariloche: 'Argentina',
  mendoza: 'Argentina',
  santiago: 'Chile',
  chile: 'Chile',
  atacama: 'Chile',
  rio: 'Brasil',
  'rio de janeiro': 'Brasil',
  'são paulo': 'Brasil',
  'sao paulo': 'Brasil',
  salvador: 'Brasil',
  brasil: 'Brasil',
  cusco: 'Peru',
  cuzco: 'Peru',
  lima: 'Peru',
  machu_picchu: 'Peru',
  'machu picchu': 'Peru',
  peru: 'Peru',
  bogota: 'Colômbia',
  bogotá: 'Colômbia',
  medellin: 'Colômbia',
  medellín: 'Colômbia',
  cartagena: 'Colômbia',
  colombia: 'Colômbia',
  colômbia: 'Colômbia',
  montevideu: 'Uruguai',
  montevideo: 'Uruguai',
  uruguai: 'Uruguai',

  // Ásia & Oceania
  toquio: 'Japão',
  tóquio: 'Japão',
  tokyo: 'Japão',
  japao: 'Japão',
  japão: 'Japão',
  kyoto: 'Japão',
  quioto: 'Japão',
  osaka: 'Japão',
  seul: 'Coreia do Sul',
  seoul: 'Coreia do Sul',
  pequim: 'China',
  beijing: 'China',
  xangai: 'China',
  shanghai: 'China',
  bangkok: 'Tailândia',
  tailandia: 'Tailândia',
  tailândia: 'Tailândia',
  phuket: 'Tailândia',
  singapura: 'Singapura',
  singapore: 'Singapura',
  dubai: 'Emirados Árabes',
  'abu dhabi': 'Emirados Árabes',
  doha: 'Catar',
  bali: 'Indonésia',
  indonesia: 'Indonésia',
  indonésia: 'Indonésia',
  sydney: 'Austrália',
  australia: 'Austrália',
  austrália: 'Austrália',
  melbourne: 'Austrália',
  auckland: 'Nova Zelândia',
  cairo: 'Egito',
  egito: 'Egito',
  marrakech: 'Marrocos',
  marrocos: 'Marrocos',
  'cidade do cabo': 'África do Sul',
  'cape town': 'África do Sul',
};

function resolveActivityCountry(activity: Activity, destinations?: string[]): string | undefined {
  if (activity.country && activity.country.trim()) {
    return activity.country.trim();
  }

  if (activity.city) {
    const parts = activity.city.split(',').map((s) => s.trim());
    if (parts.length > 1 && parts[1]) {
      return parts[1];
    }
    const cleanCity = parts[0].toLowerCase();
    if (CITY_TO_COUNTRY[cleanCity]) {
      return CITY_TO_COUNTRY[cleanCity];
    }
  }

  if (destinations && destinations.length > 0) {
    for (const dest of destinations) {
      const parts = dest.split(',').map((s) => s.trim());
      if (parts.length > 1 && parts[1]) {
        return parts[1];
      }
      const clean = parts[0].toLowerCase();
      if (CITY_TO_COUNTRY[clean]) {
        return CITY_TO_COUNTRY[clean];
      }
    }
  }

  return undefined;
}

interface DraggableActivityListProps {
  activities: Activity[];
  transports: TransportBetween[];
  destinations?: string[];
  dayTabsRef?: React.RefObject<HTMLDivElement>;
  daysData: { day: number; date: Date }[];
  selectedDay: number;
  compactView?: boolean;
  itineraryCurrency?: string;
  dragState?: DragState;
  onStartDrag?: (activity: Activity, day: number, index: number, event: React.PointerEvent) => void;
  onReorder: (activities: Activity[]) => void;
  onDelete: (activity: Activity) => void;
  onMoveToDay: (activity: Activity, targetDay: number) => void;
  onActivityClick: (activity: Activity) => void;
  onEditNote?: (activity: Activity) => void;
  getTransportIcon?: (type: TransportBetween['type']) => string;
  onUpdateTransport?: (index: number, data: TransportData) => void;
  onDeleteTransport?: (index: number) => void;
}

export function DraggableActivityList({
  activities,
  transports,
  destinations,
  daysData,
  selectedDay,
  dragState,
  onStartDrag,
  onReorder,
  onDelete,
  onMoveToDay,
  onActivityClick,
  onEditNote,
  onUpdateTransport,
  onDeleteTransport,
}: DraggableActivityListProps) {
  const [movingActivity, setMovingActivity] = useState<Activity | null>(null);
  const [editingTransportIndex, setEditingTransportIndex] = useState<number | null>(null);

  const handleOpenGoogleMaps = (activity: Activity) => {
    const query = activity.lat && activity.lng
      ? `${activity.lat},${activity.lng}`
      : encodeURIComponent(`${activity.name}, ${activity.city || ''}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const renderDropPlaceholder = (posKey?: string | number) => (
    <motion.div
      key={`subtle-gap-${selectedDay}-${posKey ?? 'end'}`}
      layout
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 32, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 380 }}
      className="w-full flex items-center justify-center my-0.5 pointer-events-none"
    >
      <div className="w-12 h-1 rounded-full bg-[#1D4ED8]/40" />
    </motion.div>
  );

  if (activities.length === 0) {
    const isDropTargetEmptyDay = dragState?.isDragging && dragState.targetDay === selectedDay;

    return (
      <div className="space-y-2">
        {isDropTargetEmptyDay ? (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 48 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="w-full rounded-2xl border border-dashed border-[#1D4ED8]/40 bg-[#EFF6FF]/40 flex items-center justify-center pointer-events-none my-1"
          >
            <div className="w-12 h-1 rounded-full bg-[#1D4ED8]/50" />
          </motion.div>
        ) : (
          <div className="py-8 text-center bg-white rounded-2xl border border-dashed border-[#E5E5E7] p-6">
            <p className="text-[14px] font-medium text-[#8E8E93] font-['Urbanist',sans-serif]">Este dia ainda está vazio.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 relative">
      {activities.map((activity, index) => {
        const transport = transports[index];
        const hasTransport = index < activities.length - 1 && transport;

        const isCurrentlyDragged =
          dragState?.isDragging &&
          dragState.sourceDay === selectedDay &&
          dragState.sourceIndex === index;

        const shouldShowPlaceholderBefore =
          dragState?.isDragging &&
          dragState.targetDay === selectedDay &&
          dragState.targetIndex === index;

        return (
          <React.Fragment key={activity.id}>
            {/* Subtle Insertion Spacing (espaçamento sutil entre os cards) */}
            {shouldShowPlaceholderBefore && renderDropPlaceholder(index)}

            <div
              data-activity-card="true"
              data-activity-id={activity.id}
              data-activity-index={index}
              data-day={selectedDay}
              onPointerDown={(e) => onStartDrag && onStartDrag(activity, selectedDay, index, e)}
              className={`transition-all duration-200 select-none cursor-grab active:cursor-grabbing touch-none ${isCurrentlyDragged
                  ? 'opacity-30 border-2 border-dashed border-[#1D4ED8] rounded-2xl bg-[#EFF6FF]/40 pointer-events-none scale-[0.98]'
                  : ''
                }`}
            >
              {/* Activity Card or Standalone Note Card */}
              {activity.type === 'note' ? (
                /* Standalone Personal Note (Matching user image & Figma Frame 1321316481) */
                <div className="bg-white py-1.5 pl-3 pr-1 relative">
                  <div className="flex gap-3.5 items-start w-full isolate">
                    {/* Left Box (Grey thumbnail with Map Pin Marker + Chat Bubble Icon) */}
                    <div className="relative w-[85px] h-[75px] rounded-[8px] bg-[#E8E8EB] flex items-center justify-center shrink-0 pointer-events-none">
                      {/* Map Pin Badge on Top-Left */}
                      <div className="absolute -top-2.5 -left-2.5 z-10 w-7 h-[34px] drop-shadow-xs">
                        <svg
                          viewBox="0 0 28 34"
                          className="w-full h-full"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M14 0C6.26801 0 0 6.26801 0 14C0 24 14 34 14 34C14 34 28 24 28 14C28 6.26801 21.732 0 14 0Z"
                            fill="#233ACF"
                          />
                          <text
                            x="14"
                            y="13.5"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#FEFEFE"
                            fontSize="13"
                            fontWeight="700"
                            fontFamily="'Urbanist', system-ui, -apple-system, sans-serif"
                          >
                            {index + 1}
                          </text>
                        </svg>
                      </div>

                      {/* Speech Bubble Icon */}
                      <MessageSquare className="w-7 h-7 text-[#141530]" strokeWidth={1.8} />
                    </div>

                    {/* Content Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-start py-0.5 pointer-events-none">
                      {/* Title Row */}
                      <div className="flex items-start justify-between">
                        <h4 className="text-[16px] font-bold text-[#1A1C40] font-['Urbanist',sans-serif] leading-tight truncate">
                          {activity.name || 'Anotação pessoal'}
                        </h4>

                        <div
                          className="flex items-center gap-1 pointer-events-auto"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* 3-dots Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="p-1 -mr-1 rounded-full text-[#141530] hover:bg-black/5 transition-colors"
                                aria-label="Opções"
                              >
                                <MoreHorizontal className="w-5 h-5 text-[#141530]" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-white rounded-xl shadow-lg border border-[#E5E5E7] p-1 z-30 font-['Urbanist',sans-serif]">
                              {onEditNote && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditNote(activity);
                                  }}
                                  className="text-[13px] py-2 px-3 flex items-center gap-2.5 cursor-pointer text-[#141530] font-semibold"
                                >
                                  <Pencil className="w-4 h-4 text-[#233ACF]" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMovingActivity(activity);
                                }}
                                className="text-[13px] py-2 px-3 flex items-center gap-2.5 cursor-pointer text-[#141530]"
                              >
                                <ArrowRightLeft className="w-4 h-4 text-[#141530]" />
                                <span>Mover para outro dia</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(activity);
                                }}
                                className="text-[13px] py-2 px-3 flex items-center gap-2.5 cursor-pointer text-[#DC2626] focus:text-[#DC2626]"
                              >
                                <Trash2 className="w-4 h-4 text-[#DC2626]" />
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Note Text */}
                      {(activity.noteText || activity.personalNote || activity.observation) && (
                        <p className="text-[13px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif] line-clamp-2 leading-[16px] mt-1.5 break-words">
                          {activity.noteText || activity.personalNote || activity.observation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Activity Card (Figma Frame 1321316470 / 1321316480) */
                <div className="bg-white py-1.5 pl-3 pr-1 relative">
                  <div className="flex flex-col items-start gap-3 w-full isolate">
                    {/* Top Row: Image (with Map Pin Marker) + Content Info */}
                    <div className="flex gap-3.5 items-start w-full">
                      {/* Thumbnail with Blue Pin Number Badge */}
                      <div className="relative w-[85px] h-[75px] rounded-[8px] bg-muted shrink-0 pointer-events-none">
                        <img
                          src={activity.image}
                          alt={activity.name}
                          className="w-full h-full object-cover rounded-[8px]"
                          loading="lazy"
                        />
                        {/* Map Pin Badge on Top-Left */}
                        <div className="absolute -top-2.5 -left-2.5 z-10 w-7 h-[34px] drop-shadow-xs">
                          <svg
                            viewBox="0 0 28 34"
                            className="w-full h-full"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M14 0C6.26801 0 0 6.26801 0 14C0 24 14 34 14 34C14 34 28 24 28 14C28 6.26801 21.732 0 14 0Z"
                              fill="#233ACF"
                            />
                            <text
                              x="14"
                              y="13.5"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="#FEFEFE"
                              fontSize="13"
                              fontWeight="700"
                              fontFamily="'Urbanist', system-ui, -apple-system, sans-serif"
                            >
                              {index + 1}
                            </text>
                          </svg>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-start py-0.5 pointer-events-none">
                        {/* Title Row */}
                        <div className="flex items-start justify-between">
                          <h4 className="text-[16px] font-semibold text-[#1A1C40] font-['Urbanist',sans-serif] leading-tight truncate">
                            {activity.name}
                          </h4>

                          <div
                            className="flex items-center gap-1 pointer-events-auto"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* 3-dots Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-1 -mr-1 rounded-full text-[#141530] hover:bg-black/5 transition-colors"
                                  aria-label="Opções"
                                >
                                  <MoreHorizontal className="w-5 h-5 text-[#141530]" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 bg-white rounded-xl shadow-lg border border-[#E5E5E7] p-1 z-30 font-['Urbanist',sans-serif]">
                                {onEditNote && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditNote(activity);
                                    }}
                                    className="text-[13px] py-2 px-3 flex items-center gap-2.5 cursor-pointer text-[#141530] font-semibold"
                                  >
                                    <Pencil className="w-4 h-4 text-[#233ACF]" />
                                    <span>{activity.personalNote || activity.noteText ? 'Editar anotação' : 'Adicionar anotação'}</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenGoogleMaps(activity);
                                  }}
                                  className="text-[13px] py-2 px-3 flex items-center gap-2.5 cursor-pointer text-[#141530]"
                                >
                                  <Navigation className="w-4 h-4 text-[#233ACF]" />
                                  <span>Abrir com Google Maps</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMovingActivity(activity);
                                  }}
                                  className="text-[13px] py-2 px-3 flex items-center gap-2.5 cursor-pointer text-[#141530]"
                                >
                                  <ArrowRightLeft className="w-4 h-4 text-[#141530]" />
                                  <span>Mover para outro dia</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(activity);
                                  }}
                                  className="text-[13px] py-2 px-3 flex items-center gap-2.5 cursor-pointer text-[#DC2626] focus:text-[#DC2626]"
                                >
                                  <Trash2 className="w-4 h-4 text-[#DC2626]" />
                                  <span>Excluir</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Category | Country */}
                        {(() => {
                          const country = resolveActivityCountry(activity, destinations);
                          const locationLabel = country || activity.city;
                          return (
                            <p className="text-[12px] font-semibold text-[#080B43] font-['Urbanist',sans-serif] truncate mb-1">
                              {activity.category}{locationLabel ? ` | ${locationLabel}` : ''}
                            </p>
                          );
                        })()}

                        {/* Description */}
                        <p className="text-[12px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif] line-clamp-2 leading-[14px]">
                          {activity.observation || 'Ícone de Paris e um dos lugares mais famosos do mundo.'}
                        </p>
                      </div>
                    </div>

                    {/* Attached Personal Note */}
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEditNote) {
                          onEditNote(activity);
                        }
                      }}
                      className="w-full cursor-pointer group/note hover:opacity-90 transition-opacity pointer-events-auto"
                    >
                      {activity.personalNote || activity.noteText ? (
                        <div className="flex items-stretch gap-3 w-full">
                          <div className="w-[4px] rounded-[8px] bg-[#233ACF] shrink-0 self-stretch min-h-[39px]" />
                          <div className="flex flex-col gap-1 min-w-0 flex-1 justify-center">
                            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1C40] font-['Urbanist',sans-serif]">
                              <Pencil className="w-4 h-4 text-[#141530] shrink-0" />
                              <span>Anotação pessoal:</span>
                            </div>
                            <p className="text-[12px] font-medium text-[#141530] font-['Urbanist',sans-serif] leading-[14px] break-words">
                              {activity.personalNote || activity.noteText}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[14px] font-medium italic text-[#7F7F7F] font-['Urbanist',sans-serif] group-hover/note:text-[#233ACF] transition-colors">
                          Adicionar nota do lugar....
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Displacement / Transit info between consecutive activities */}
              {index < activities.length - 1 && (() => {
                const currentAct = activities[index];
                const nextAct = activities[index + 1];
                const isAdjacentToNote = currentAct.type === 'note' || nextAct.type === 'note';
                const hasCalculatedTransport =
                  !isAdjacentToNote &&
                  transport &&
                  transport.duration &&
                  transport.duration !== '' &&
                  transport.duration !== '0 min';

                if (hasCalculatedTransport) {
                  return (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTransportIndex(index);
                      }}
                      className="py-2 pl-3 flex items-center gap-2 text-[#7F7F7F] cursor-pointer group hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#141530] font-['Urbanist',sans-serif] flex-shrink-0">
                        <Footprints className="w-3.5 h-3.5 text-[#141530]" />
                        <span>
                          {transport.duration} {transport.distance ? `(${transport.distance})` : ''}
                        </span>
                        <span className="text-[11px] text-[#7F7F7F]">&gt;</span>
                      </div>
                      <div className="flex-1 h-[1px] bg-[#E6E6E6] ml-1" />
                    </div>
                  );
                }

                return (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTransportIndex(index);
                    }}
                    className="py-2.5 pl-3 flex items-center gap-2 text-[#141530] cursor-pointer group hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#141530] font-['Urbanist',sans-serif] flex-shrink-0">
                      <span>Adicionar locomoção</span>
                      <span className="text-[12px] text-[#141530]">&gt;</span>
                    </div>
                    <div className="flex-1 h-[1px] bg-[#E6E6E6] ml-2" />
                  </div>
                );
              })()}
            </div>
          </React.Fragment>
        );
      })}

      {/* Dynamic Placeholder at the end of the list if dragged to bottom */}
      {dragState?.isDragging &&
        dragState.targetDay === selectedDay &&
        dragState.targetIndex !== null &&
        dragState.targetIndex >= activities.length &&
        renderDropPlaceholder()}

      {/* Move to another day modal */}
      {movingActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-[16px] font-bold text-[#1A1C40] mb-1">Mover atividade</h3>
            <p className="text-[13px] text-[#8E8E93] mb-4">
              Escolha o dia de destino para "{movingActivity.name}":
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto mb-5">
              {daysData.map((d) => (
                <button
                  key={d.day}
                  onClick={() => {
                    onMoveToDay(movingActivity, d.day);
                    setMovingActivity(null);
                  }}
                  disabled={d.day === selectedDay}
                  className={`w-full py-2.5 px-4 rounded-xl text-[13px] font-semibold text-left transition-all ${d.day === selectedDay
                      ? 'bg-[#F4F4F5] text-[#8E8E93] cursor-not-allowed'
                      : 'bg-[#F9F9FB] text-[#1A1C40] hover:bg-[#EFF6FF] hover:text-[#2563EB]'
                    }`}
                >
                  Dia {d.day}
                </button>
              ))}
            </div>

            <button
              onClick={() => setMovingActivity(null)}
              className="w-full py-3 rounded-2xl bg-[#F4F4F5] text-[#1A1C40] text-[13px] font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Edit Transport Sheet */}
      {editingTransportIndex !== null && (
        <EditTransportSheet
          open={true}
          onClose={() => setEditingTransportIndex(null)}
          transport={transports[editingTransportIndex] || { type: 'walk', duration: '15 min' }}
          fromName={activities[editingTransportIndex]?.name}
          toName={activities[editingTransportIndex + 1]?.name}
          onSave={(data) => {
            onUpdateTransport?.(editingTransportIndex, data);
            setEditingTransportIndex(null);
          }}
          onDelete={() => {
            onDeleteTransport?.(editingTransportIndex);
            setEditingTransportIndex(null);
          }}
        />
      )}
    </div>
  );
}
