import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { EditTransportSheet, TransportData } from './EditTransportSheet';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';

// ... keep existing code (interfaces, SPEED_MAP, calcDistance, DAY_COLORS unchanged)

interface Activity {
  id: number;
  type?: 'activity' | 'note';
  startTime: string;
  endTime: string;
  category: string;
  categoryColor: string;
  name: string;
  image: string;
  openHours: string;
  rating: number;
  price: string;
  noteText?: string;
  observation?: string;
}

interface TransportBetween {
  type: 'walk' | 'bus' | 'metro' | 'car';
  duration: string;
  cost?: string;
  distance?: string;
}

interface PlaceCoord {
  name: string;
  lat: number;
  lng: number;
}

interface DraggableActivityListProps {
  activities: Activity[];
  transports: TransportBetween[];
  dayTabsRef: React.RefObject<HTMLDivElement>;
  daysData: { day: number; date: Date }[];
  selectedDay: number;
  compactView?: boolean;
  onReorder: (activities: Activity[]) => void;
  onDelete: (activity: Activity) => void;
  onMoveToDay: (activity: Activity, targetDay: number) => void;
  onActivityClick: (activity: Activity) => void;
  getTransportIcon: (type: TransportBetween['type']) => string;
  onUpdateTransport?: (index: number, data: TransportData) => void;
  onDeleteTransport?: (index: number) => void;
  places?: PlaceCoord[];
  repeatedNames?: Set<string>;
}

const SPEED_MAP: Record<TransportBetween['type'], number> = {
  walk: 5,
  bus: 25,
  metro: 35,
  car: 40,
};

function calcDistance(type: TransportBetween['type'], duration: string): string | null {
  const match = duration.match(/(\d+)/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  if (minutes <= 0) return null;
  const km = (SPEED_MAP[type] * minutes) / 60;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function recommendTransportType(distKm: number): TransportBetween['type'] {
  const road = distKm * 1.3;
  if (road <= 1.2) return 'walk';
  if (road <= 5) return 'bus';
  if (road <= 15) return 'metro';
  return 'car';
}

const DAY_COLORS = [
  'rgba(53, 135, 242, 0.30)',
  'rgba(41, 166, 153, 0.30)',
  'rgba(179, 242, 41, 0.30)',
  'rgba(242, 89, 34, 0.30)',
  'rgba(242, 176, 12, 0.30)',
  'rgba(242, 139, 12, 0.30)',
  'rgba(26, 28, 64, 0.30)',
  'rgba(10, 14, 89, 0.30)',
];

export function DraggableActivityList({
  activities,
  transports,
  selectedDay,
  compactView = false,
  onActivityClick,
  getTransportIcon,
  onUpdateTransport,
  onDeleteTransport,
  places = [],
  repeatedNames,
}: DraggableActivityListProps) {
  const [editTransportIndex, setEditTransportIndex] = useState<number | null>(null);
  const [transportActionIndex, setTransportActionIndex] = useState<number | null>(null);
  const stepColor = DAY_COLORS[(selectedDay - 1) % DAY_COLORS.length];

  const handleOpenMap = (index: number) => {
    // Get the two activities around this transport
    const fromActivity = activities[index];
    const toActivity = activities[index + 1];
    const query = toActivity ? toActivity.name : fromActivity.name;
    const geoUrl = `geo:0,0?q=${encodeURIComponent(query)}`;
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    
    // Try native geo scheme, fallback to Google Maps
    const link = document.createElement('a');
    link.href = geoUrl;
    link.click();
    
    // Fallback after a short delay
    setTimeout(() => {
      window.open(fallbackUrl, '_blank');
    }, 500);
    
    setTransportActionIndex(null);
  };

  return (
    <>
      <div className="mb-6 relative">
        {activities.map((activity, index) => {
          const isLast = index === activities.length - 1;
          const transport = transports[index];

          return (
            <React.Fragment key={`${activity.id}-${index}`}>
              {/* Activity row: timeline left + card right */}
              <div className="flex gap-3">
                {/* Timeline left column - times only */}
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: 44 }}>
                  {/* Start & end time */}
                  <div className="flex flex-col items-center pt-[15px]">
                    <span className="text-[12px] font-semibold text-foreground leading-tight">
                      {activity.startTime}
                    </span>
                    <span className="text-[12px] text-muted-foreground leading-tight mt-0.5">
                      {activity.endTime}
                    </span>
                  </div>
                  {/* Vertical dashed line */}
                  {!isLast && (
                    <div className="flex-1 w-px border-l-2 border-dashed border-muted-foreground/20 min-h-[16px] mt-1.5" />
                  )}
                </div>

                {/* Card */}
                <div className="flex-1 min-w-0 pb-2">
                  {activity.type === 'note' ? (
                    /* Note card */
                    compactView ? (
                      <div
                        className="bg-card rounded-2xl px-3.5 py-3 cursor-pointer active:scale-[0.98] transition-all border border-border/40"
                        onClick={() => onActivityClick(activity)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                            style={{ backgroundColor: stepColor, color: '#0A0E59' }}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[14px] font-semibold text-foreground truncate block">
                              {activity.name || 'Tempo livre'}
                            </span>
                            {activity.noteText && (
                              <p className="text-[12px] font-medium text-muted-foreground mt-0.5 line-clamp-1">
                                {activity.noteText}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="bg-card rounded-2xl p-3.5 cursor-pointer active:scale-[0.98] transition-all border border-border/40"
                        onClick={() => onActivityClick(activity)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                            style={{ backgroundColor: stepColor, color: '#0A0E59' }}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[14px] font-semibold text-foreground">
                                {activity.name || 'Tempo livre'}
                              </span>
                            </div>
                            {activity.noteText && (
                              <p className="text-[13px] font-medium text-muted-foreground leading-relaxed mt-1.5">
                                {activity.noteText}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onActivityClick(activity); }}
                            className="p-1 flex-shrink-0 -mr-1 -mt-0.5"
                          >
                            <Icon name="more_horiz" size={20} className="text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    )
                  ) : compactView ? (
                    /* Compact activity card */
                    <div
                      className="bg-card rounded-2xl px-3.5 py-3 cursor-pointer active:scale-[0.98] transition-all border border-border/40"
                      onClick={() => onActivityClick(activity)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Step number badge */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ backgroundColor: stepColor, color: '#0A0E59' }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-foreground truncate">
                              {activity.name}
                            </span>
                            {repeatedNames?.has(activity.name?.trim().toLowerCase() ?? '') && (
                              <span className="inline-flex items-center text-[10px] font-semibold px-2 h-[18px] rounded-2xl flex-shrink-0" style={{ backgroundColor: '#FFE9D6', color: '#C2410C' }}>
                                Repetido
                              </span>
                            )}
                          </div>
                          {activity.observation && (
                            <p className="text-[12px] font-medium text-muted-foreground mt-0.5 line-clamp-1">
                              {activity.observation}
                            </p>
                          )}
                        </div>
                        {activity.price && (
                          <span className="text-[12px] font-semibold text-foreground flex-shrink-0">
                            {activity.price}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Full activity card */
                    <div
                      className="bg-card rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all border border-border/40"
                      onClick={() => onActivityClick(activity)}
                    >
                      <div className="flex gap-3 p-3">
                        {/* Text content first */}
                        <div className="flex-1 min-w-0">
                           <div className="flex items-start justify-between">
                             <div className="flex items-center gap-2">
                               {/* Step number badge */}
                               <div
                                 className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                 style={{ backgroundColor: stepColor, color: '#0A0E59' }}
                               >
                                 {index + 1}
                               </div>
                               <h4 className="text-[14px] font-semibold text-foreground leading-tight line-clamp-2">
                                 {activity.name}
                               </h4>
                             </div>
                           </div>
                           <div className="flex items-center gap-2 mt-1.5 ml-9">
                             {activity.category && (
                               <span className="inline-flex items-center text-[11px] font-medium text-[#8E8E93] px-2.5 h-5 rounded-2xl bg-[#F2F2F2]">
                                 {activity.category}
                               </span>
                             )}
                             {repeatedNames?.has(activity.name?.trim().toLowerCase() ?? '') && (
                               <span className="inline-flex items-center text-[11px] font-semibold px-2.5 h-5 rounded-2xl" style={{ backgroundColor: '#FFE9D6', color: '#C2410C' }}>
                                 Repetido
                               </span>
                             )}
                              {activity.price && (() => {
                                const raw = String(activity.price).replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
                                const num = parseFloat(raw);
                                if (!isFinite(num) || num <= 0) return null;
                                const formatted = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                return (
                                  <span className="text-[12px] font-medium text-muted-foreground">
                                    R$ {formatted}
                                  </span>
                                );
                              })()}
                           </div>
                           {activity.observation && (
                              <p className="text-[12px] font-medium text-muted-foreground mt-1 ml-9 line-clamp-1">
                                {activity.observation}
                              </p>
                            )}
                        </div>
                        {/* Image on the right */}
                        {activity.image && (
                          <img
                            src={activity.image}
                            alt={activity.name}
                            className="w-[68px] h-[68px] rounded-xl object-cover flex-shrink-0"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transport between items */}
              {!isLast && (
                <div className="flex gap-3" style={{ marginTop: -2, marginBottom: 6 }}>
                  {/* Timeline column - transport icon */}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 44 }}>
                    {transport ? (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/60 border border-border/40">
                        <Icon name={getTransportIcon(transport.type)} size={15} className="text-foreground" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/60 border border-border/40">
                        <Icon name="directions_walk" size={15} className="text-muted-foreground" />
                      </div>
                    )}
                    {/* Continue dashed line */}
                    <div className="flex-1 w-px border-l-2 border-dashed border-muted-foreground/20 min-h-[6px]" />
                  </div>

                  {/* Transport info */}
                  <button
                    className="flex items-center gap-1.5 text-muted-foreground py-0.5 flex-1 min-w-0 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => transport ? setTransportActionIndex(index) : undefined}
                  >
                    {transport ? (
                      <>
                        <span className="text-[12px] font-medium">{transport.duration}</span>
                        {(() => {
                          const km = transport.distance || calcDistance(transport.type, transport.duration);
                          return (
                            <>
                              <span className="text-[9px]">·</span>
                              <span className="text-[12px] font-medium">{km || '0 km'}</span>
                            </>
                          );
                        })()}
                        {transport.cost && (
                          <>
                            <span className="text-[9px]">·</span>
                            <span className="text-[12px] font-medium">R$ {String(transport.cost).replace(/^[€$R$\s]+/, '')}</span>
                          </>
                        )}
                        <Icon name="chevron_right" size={16} style={{ color: '#1A1C40' }} className="ml-1" />
                      </>
                    ) : (
                      <>
                        <span className="text-[12px] font-medium">0 min</span>
                        <span className="text-[9px]">·</span>
                        <span className="text-[12px] font-medium">0 km</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Transport action sheet */}
      <Sheet open={transportActionIndex !== null} onOpenChange={(open) => { if (!open) setTransportActionIndex(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl px-0 pb-8">
          <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5 mt-1" />
          <h3 className="text-[18px] font-bold text-foreground px-5 mb-4">Deslocamento</h3>
          <div className="px-5 space-y-1">
            <button
              className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl hover:bg-muted/30 transition-colors"
              onClick={() => {
                if (transportActionIndex !== null) {
                  setTransportActionIndex(null);
                  setEditTransportIndex(transportActionIndex);
                }
              }}
            >
              <div className="w-9 h-9 rounded-full bg-[#F2F2F2] flex items-center justify-center flex-shrink-0">
                <Icon name="edit" size={18} className="text-foreground" />
              </div>
              <span className="text-[14px] font-medium text-foreground flex-1 text-left">Editar</span>
              <Icon name="chevron_right" size={18} className="text-muted-foreground" />
            </button>
            <button
              className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl hover:bg-muted/30 transition-colors"
              onClick={() => {
                if (transportActionIndex !== null) {
                  handleOpenMap(transportActionIndex);
                }
              }}
            >
              <div className="w-9 h-9 rounded-full bg-[#F2F2F2] flex items-center justify-center flex-shrink-0">
                <Icon name="map" size={18} className="text-foreground" />
              </div>
              <span className="text-[14px] font-medium text-foreground flex-1 text-left">Ver no mapa</span>
              <Icon name="chevron_right" size={18} className="text-muted-foreground" />
            </button>
            {/* 
            <button
              className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl hover:bg-destructive/10 transition-colors"
              onClick={() => {
                if (transportActionIndex !== null) {
                  onDeleteTransport?.(transportActionIndex);
                  setTransportActionIndex(null);
                }
              }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
                <Icon name="delete" size={18} className="text-destructive" />
              </div>
              <span className="text-[14px] font-medium text-destructive flex-1 text-left">Excluir</span>
            </button>
            */}
          </div>
        </SheetContent>
      </Sheet>

      {editTransportIndex !== null && transports[editTransportIndex] && (() => {
        const fromAct = activities[editTransportIndex];
        const toAct = activities[editTransportIndex + 1];
        const fromPlace = fromAct ? places.find(p => p.name.toLowerCase() === fromAct.name.toLowerCase()) : undefined;
        const toPlace = toAct ? places.find(p => p.name.toLowerCase() === toAct.name.toLowerCase()) : undefined;
        const distKm = fromPlace && toPlace ? haversineKm(fromPlace.lat, fromPlace.lng, toPlace.lat, toPlace.lng) : undefined;
        const recType = distKm !== undefined ? recommendTransportType(distKm) : undefined;

        return (
          <EditTransportSheet
            open
            onClose={() => setEditTransportIndex(null)}
            transport={transports[editTransportIndex]}
            fromName={fromAct?.name}
            toName={toAct?.name}
            distanceKm={distKm}
            recommendedType={recType}
            onSave={(data) => {
              onUpdateTransport?.(editTransportIndex, data);
              setEditTransportIndex(null);
            }}
            onDelete={() => {
              onDeleteTransport?.(editTransportIndex);
              setEditTransportIndex(null);
            }}
          />
        );
      })()}
    </>
  );
}
