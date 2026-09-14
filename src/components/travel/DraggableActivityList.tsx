import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { EditTransportSheet } from './EditTransportSheet';
import { MoveActivityToDaySheet } from './MoveActivityToDaySheet';
import { MoreHorizontal, Trash2, Pencil, Footprints, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

export type TransportType = 'none' | 'train' | 'metro' | 'walk' | 'bus' | 'car' | 'bike' | 'other';

export interface TransportBetween {
  type: TransportType;
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

import { resolveActivityCountry, resolveActivityLocationLabel } from '@/lib/countryResolver';

interface DraggableActivityListProps {
  activities: Activity[];
  transports: TransportBetween[];
  destinations?: string[];
  dayTabsRef?: React.RefObject<HTMLDivElement>;
  daysData: { day: number; date: Date }[];
  selectedDay: number;
  compactView?: boolean;
  itineraryCurrency?: string;
  isFlexibleDates?: boolean;
  getActivityCount?: (day: number) => number;
  dragState?: DragState;
  onStartDrag?: (activity: Activity, day: number, index: number, event: React.PointerEvent) => void;
  onReorder: (activities: Activity[]) => void;
  onDelete: (activity: Activity) => void;
  onMoveToDay: (activity: Activity, targetDay: number) => void;
  onActivityClick: (activity: Activity) => void;
  onEditNote?: (activity: Activity) => void;
  getTransportIcon?: (type: TransportBetween['type']) => string;
  onUpdateTransport?: (index: number, data: TransportBetween) => void;
  onDeleteTransport?: (index: number) => void;
}

export function DraggableActivityList({
  activities,
  transports,
  destinations,
  daysData,
  selectedDay,
  compactView,
  itineraryCurrency,
  isFlexibleDates,
  getActivityCount,
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
  const [optionsActivity, setOptionsActivity] = useState<Activity | null>(null);
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
          <div className="py-1 px-1">
            <p className="text-[15px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif]">Este dia ainda está vazio.</p>
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

        const activityKey = activity.id ? `${activity.id}-${index}` : `${activity.name}-${activity.startTime}-${index}`;

        return (
          <React.Fragment key={activityKey}>
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOptionsActivity(activity);
                            }}
                            className="p-1 -mr-1 rounded-full text-[#141530] hover:bg-black/5 transition-colors"
                            aria-label="Opções"
                          >
                            <MoreHorizontal className="w-5 h-5 text-[#141530]" />
                          </button>
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
                    <div
                      onClick={() => onActivityClick(activity)}
                      className="flex gap-3.5 items-start w-full cursor-pointer hover:opacity-95 transition-opacity"
                    >
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
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOptionsActivity(activity);
                              }}
                              className="p-1 -mr-1 rounded-full text-[#141530] hover:bg-black/5 transition-colors"
                              aria-label="Opções"
                            >
                              <MoreHorizontal className="w-5 h-5 text-[#141530]" />
                            </button>
                          </div>
                        </div>

                        {/* Category | Country / Location */}
                        {(() => {
                          const locationLabel = resolveActivityLocationLabel(activity, destinations);
                          return (
                            <p className="text-[12px] font-semibold text-[#080B43] font-['Urbanist',sans-serif] truncate mb-1">
                              {activity.category}{locationLabel ? ` | ${locationLabel}` : ''}
                            </p>
                          );
                        })()}

                        {/* Description */}
                        <p className="text-[12px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif] line-clamp-2 leading-[14px]">
                          {activity.observation || 'Ícone do destino e um dos lugares mais famosos da região.'}
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
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTransportIndex(index);
                      }}
                      className="pt-6 pb-2 pl-3 flex items-center gap-2 text-[#7F7F7F] cursor-pointer group hover:opacity-80 transition-opacity"
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
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTransportIndex(index);
                    }}
                    className="pt-6 pb-2.5 pl-3 flex items-center gap-2 text-[#141530] cursor-pointer group hover:opacity-80 transition-opacity"
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

      {/* Move to another day bottom sheet */}
      {movingActivity && (
        <MoveActivityToDaySheet
          open={!!movingActivity}
          onClose={() => setMovingActivity(null)}
          onBack={() => {
            const act = movingActivity;
            setMovingActivity(null);
            setOptionsActivity(act);
          }}
          activityName={movingActivity.name}
          currentDay={selectedDay}
          daysData={daysData}
          isFlexibleDates={isFlexibleDates}
          getActivityCount={getActivityCount}
          onConfirm={(targetDay) => {
            onMoveToDay(movingActivity, targetDay);
            setMovingActivity(null);
          }}
        />
      )}

      {/* Activity Options Bottom Sheet (Matching user Image 2) */}
      {optionsActivity && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center"
          onClick={() => setOptionsActivity(null)}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          />

          {/* Sheet Container */}
          <div
            className="relative w-full bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto"
            style={{ animation: 'slideUpSheet 0.32s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>

            {/* Header with Close X and Title */}
            <div className="px-5 pb-3 pt-2">
              <div className="flex justify-end -mt-2 -mr-1 mb-2">
                <button
                  type="button"
                  onClick={() => setOptionsActivity(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                  aria-label="Fechar"
                >
                  <Icon name="close" size={20} className="text-foreground" />
                </button>
              </div>
              <div className="pr-2">
                <h3 className="text-[18px] font-bold text-foreground font-['Urbanist',sans-serif]">
                  Mais opções
                </h3>
                <p className="text-[14px] text-muted-foreground font-medium mt-0.5 font-['Urbanist',sans-serif]">
                  {optionsActivity.name || (optionsActivity.type === 'note' ? 'Anotação' : 'Opções')}
                </p>
              </div>
            </div>

            {/* Options List strictly matching Image 2 */}
            <div className="px-5 pb-6 divide-y divide-border/40 font-['Urbanist',sans-serif]">
              {/* 1. Abrir no Google Maps */}
              {optionsActivity.type !== 'note' && (
                <button
                  type="button"
                  onClick={() => {
                    const act = optionsActivity;
                    setOptionsActivity(null);
                    handleOpenGoogleMaps(act);
                  }}
                  className="w-full flex items-center gap-3.5 py-4 px-1 text-foreground hover:bg-muted/30 transition-colors"
                >
                  <div className="w-6 h-6 flex items-center justify-center text-foreground">
                    <Icon name="map" size={20} className="text-foreground" />
                  </div>
                  <span className="text-[15px] font-medium text-foreground flex-1 text-left">
                    Abrir no Google Maps
                  </span>
                  <Icon name="chevron_right" size={20} className="text-muted-foreground/80" />
                </button>
              )}

              {/* For notes: Editar anotação */}
              {optionsActivity.type === 'note' && onEditNote && (
                <button
                  type="button"
                  onClick={() => {
                    const act = optionsActivity;
                    setOptionsActivity(null);
                    onEditNote(act);
                  }}
                  className="w-full flex items-center gap-3.5 py-4 px-1 text-foreground hover:bg-muted/30 transition-colors"
                >
                  <div className="w-6 h-6 flex items-center justify-center text-foreground">
                    <Pencil size={18} className="text-foreground" />
                  </div>
                  <span className="text-[15px] font-medium text-foreground flex-1 text-left">
                    Editar
                  </span>
                  <Icon name="chevron_right" size={20} className="text-muted-foreground/80" />
                </button>
              )}

              {/* 2. Mover para outro dia */}
              <button
                type="button"
                onClick={() => {
                  const act = optionsActivity;
                  setOptionsActivity(null);
                  setMovingActivity(act);
                }}
                className="w-full flex items-center gap-3.5 py-4 px-1 text-foreground hover:bg-muted/30 transition-colors"
              >
                <div className="w-6 h-6 flex items-center justify-center text-foreground">
                  <Icon name="swap_horiz" size={20} className="text-foreground" />
                </div>
                <span className="text-[15px] font-medium text-foreground flex-1 text-left">
                  Mover para outro dia
                </span>
                <Icon name="chevron_right" size={20} className="text-muted-foreground/80" />
              </button>

              {/* 3. Excluir */}
              <button
                type="button"
                onClick={() => {
                  const act = optionsActivity;
                  setOptionsActivity(null);
                  onDelete(act);
                }}
                className="w-full flex items-center gap-3.5 py-4 px-1 text-[#DC2626] hover:bg-destructive/10 transition-colors"
              >
                <div className="w-6 h-6 flex items-center justify-center text-[#DC2626]">
                  <Trash2 size={20} className="text-[#DC2626]" />
                </div>
                <span className="text-[15px] font-medium text-[#DC2626] flex-1 text-left">
                  Excluir
                </span>
                <Icon name="chevron_right" size={20} className="text-[#DC2626]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transport Sheet */}
      {editingTransportIndex !== null && (
        <EditTransportSheet
          open={true}
          onClose={() => setEditingTransportIndex(null)}
          transport={transports[editingTransportIndex] || { type: 'walk', duration: '15 min' }}
          currency={itineraryCurrency || 'BRL'}
          fromName={activities[editingTransportIndex]?.name}
          toName={activities[editingTransportIndex + 1]?.name}
          distanceKm={
            activities[editingTransportIndex]?.lat && activities[editingTransportIndex]?.lng && 
            activities[editingTransportIndex + 1]?.lat && activities[editingTransportIndex + 1]?.lng 
              ? haversineKm(
                  activities[editingTransportIndex].lat!, activities[editingTransportIndex].lng!,
                  activities[editingTransportIndex + 1].lat!, activities[editingTransportIndex + 1].lng!
                )
              : undefined
          }
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
