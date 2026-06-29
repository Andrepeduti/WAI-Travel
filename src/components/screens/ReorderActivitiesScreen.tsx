import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Reorder, useDragControls, type PanInfo } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BackButton } from '@/components/ui/BackButton';
import { cn } from '@/lib/utils';

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

export interface DayActivities {
  day: number;
  date: Date;
  activities: Activity[];
}

interface ReorderActivitiesScreenProps {
  allDays: DayActivities[];
  onSave: (updatedDays: DayActivities[]) => void;
  onBack: () => void;
}

interface ActivityRowProps {
  item: Activity;
  index: number;
  dayNumber: number;
  daysCount: number;
  isMoving: boolean;
  onToggleMove: () => void;
  days: DayActivities[];
  onMoveToDay: (targetDay: number) => void;
  onDragMove: (point: { x: number; y: number }, fromDay: number) => void;
  onDragEnd: (fromDay: number, activityId: number) => void;
}

function ActivityRow({
  item,
  index,
  dayNumber,
  daysCount,
  isMoving,
  onToggleMove,
  days,
  onMoveToDay,
  onDragMove,
  onDragEnd,
}: ActivityRowProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="touch-manipulation"
      whileDrag={{ scale: 1.03, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50 }}
      onDrag={(_, info: PanInfo) => onDragMove(info.point, dayNumber)}
      onDragEnd={() => onDragEnd(dayNumber, item.id)}
    >
      <div
        className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3.5"
        style={{ border: '1px solid hsl(var(--border))' }}
      >
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            controls.start(e);
          }}
          className="flex-shrink-0 text-muted-foreground/50 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          aria-label="Arrastar para reordenar"
        >
          <Icon name="drag_indicator" size={20} />
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold"
          style={{
            background: `${item.categoryColor || '#8E8E93'}30`,
            color: '#0A0E59',
          }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-foreground truncate">
            {item.type === 'note' ? (item.noteText || 'Tempo livre') : item.name}
          </p>
        </div>
        {daysCount > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMove();
            }}
            aria-label="Mover para outro dia"
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isMoving ? 'bg-muted' : 'hover:bg-muted/50'}`}
          >
            <Icon name="swap_vert" size={16} style={{ color: '#1A1C40' }} />
          </button>
        )}
      </div>

      {/* Move to day selector */}
      {isMoving && (
        <div className="mt-2 mb-1 bg-card rounded-2xl border border-border/40 overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-[13px] font-semibold text-muted-foreground">
            Mover para:
          </p>
          <div className="flex flex-col pb-2">
            {days.filter(d => d.day !== dayNumber).map((targetDay) => {
              const tw = format(targetDay.date, 'EEE', { locale: ptBR });
              const tcw = tw.charAt(0).toUpperCase() + tw.slice(1);
              const tds = format(targetDay.date, "d 'de' MMM", { locale: ptBR });
              return (
                <button
                  key={targetDay.day}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToDay(targetDay.day);
                  }}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold"
                      style={{ backgroundColor: '#F2F2F2', color: '#1A1C40' }}
                    >
                      {targetDay.day}
                    </div>
                    <span className="text-[14px] font-medium text-foreground">
                      {tcw}, {tds}
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-muted-foreground">
                    {targetDay.activities.length} {targetDay.activities.length === 1 ? 'atividade' : 'atividades'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Reorder.Item>
  );
}

export function ReorderActivitiesScreen({
  allDays,
  onSave,
  onBack,
}: ReorderActivitiesScreenProps) {
  const [days, setDays] = useState<DayActivities[]>(() =>
    allDays.map(d => ({ ...d, activities: [...d.activities] }))
  );
  const [movingActivity, setMovingActivity] = useState<{ activityId: number; fromDay: number } | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const dayHeaderRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const hoveredDayRef = useRef<number | null>(null);
  const expandTimerRef = useRef<{ day: number; timer: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    hoveredDayRef.current = hoveredDay;
  }, [hoveredDay]);

  const toggleCollapse = (day: number) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const updateDayActivities = useCallback((day: number, newActivities: Activity[]) => {
    setDays(prev => prev.map(d => d.day === day ? { ...d, activities: newActivities } : d));
  }, []);

  const moveActivityBetweenDays = useCallback((fromDay: number, targetDay: number, activityId: number) => {
    setDays(prev => {
      const source = prev.find(d => d.day === fromDay);
      const activity = source?.activities.find(a => a.id === activityId);
      if (!activity) return prev;
      return prev.map(d => {
        if (d.day === fromDay) return { ...d, activities: d.activities.filter(a => a.id !== activityId) };
        if (d.day === targetDay) return { ...d, activities: [...d.activities, activity] };
        return d;
      });
    });
  }, []);

  const handleMoveToDay = (targetDay: number) => {
    if (!movingActivity) return;
    moveActivityBetweenDays(movingActivity.fromDay, targetDay, movingActivity.activityId);
    setMovingActivity(null);
  };

  const handleDragMove = useCallback((point: { x: number; y: number }, fromDay: number) => {
    let foundDay: number | null = null;
    dayHeaderRefs.current.forEach((el, dayNum) => {
      const rect = el.getBoundingClientRect();
      if (point.y >= rect.top && point.y <= rect.bottom && point.x >= rect.left && point.x <= rect.right) {
        foundDay = dayNum;
      }
    });

    const targetDay = foundDay !== null && foundDay !== fromDay ? foundDay : null;
    if (targetDay !== hoveredDayRef.current) {
      setHoveredDay(targetDay);

      // Auto-expand collapsed day after hovering ~500ms
      if (expandTimerRef.current) {
        clearTimeout(expandTimerRef.current.timer);
        expandTimerRef.current = null;
      }
      if (targetDay !== null && collapsedDays.has(targetDay)) {
        const dayToExpand = targetDay;
        expandTimerRef.current = {
          day: dayToExpand,
          timer: setTimeout(() => {
            if (hoveredDayRef.current === dayToExpand) {
              setCollapsedDays(prev => {
                const next = new Set(prev);
                next.delete(dayToExpand);
                return next;
              });
            }
            expandTimerRef.current = null;
          }, 500),
        };
      }
    }
  }, [collapsedDays]);

  const handleDragEnd = useCallback((fromDay: number, activityId: number) => {
    const target = hoveredDayRef.current;
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current.timer);
      expandTimerRef.current = null;
    }
    if (target !== null && target !== fromDay) {
      moveActivityBetweenDays(fromDay, target, activityId);
    }
    setHoveredDay(null);
  }, [moveActivityBetweenDays]);

  const setDayHeaderRef = useCallback((dayNumber: number) => (el: HTMLDivElement | null) => {
    if (el) dayHeaderRefs.current.set(dayNumber, el);
    else dayHeaderRefs.current.delete(dayNumber);
  }, []);

  return (
    <div
      className="flex flex-col h-full bg-background"
      style={{ fontFamily: 'var(--font-family-primary)' }}
    >
      {/* Header */}
 <header className="sticky top-0 z-20 bg-background px-5 pb-3">
        <div className="flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Reordenar</h1>
        </div>
      </header>

      {/* All days */}
      <div className="flex-1 overflow-y-auto px-5 pb-28" style={{ paddingTop: 40 }}>
        {days.map((dayData) => {
          const weekday = format(dayData.date, 'EEE', { locale: ptBR });
          const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
          const dateStr = format(dayData.date, "d 'de' MMM", { locale: ptBR });
          const isCollapsed = collapsedDays.has(dayData.day);
          const actCount = dayData.activities.length;
          const isHoverTarget = hoveredDay === dayData.day;

          return (
            <div key={dayData.day} ref={setDayHeaderRef(dayData.day)} className="mb-5">

              {/* Day header - accordion toggle + drop target */}
              <div
                className={cn(
                  "rounded-xl mb-3 transition-all",
                  isHoverTarget && "ring-2 ring-primary bg-primary/5 -mx-2 px-2 py-1"
                )}
              >

                <button
                  onClick={() => toggleCollapse(dayData.day)}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
                      style={{ backgroundColor: '#1A1C40', color: '#FFFFFF' }}
                    >
                      {dayData.day}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[15px] font-bold text-foreground">
                        {capitalizedWeekday}, {dateStr}
                      </span>
                      <span className="text-[12px] font-medium text-muted-foreground mt-0.5">
                        {isHoverTarget ? 'Soltar aqui para mover' : `${actCount} ${actCount === 1 ? 'atividade' : 'atividades'}`}
                      </span>
                    </div>
                  </div>
                  <Icon
                    name={isCollapsed ? 'chevron_down' : 'chevron_up'}
                    size={20}
                    className="text-muted-foreground"
                  />
                </button>
              </div>

              {/* Activities list - accordion content */}
              {!isCollapsed && actCount > 0 && (
                <Reorder.Group
                  axis="y"
                  values={dayData.activities}
                  onReorder={(newOrder) => updateDayActivities(dayData.day, newOrder)}
                  className="flex flex-col gap-2"
                >
                  {dayData.activities.map((item, index) => {
                    const isMoving = movingActivity?.activityId === item.id && movingActivity?.fromDay === dayData.day;
                    return (
                      <ActivityRow
                        key={item.id}
                        item={item}
                        index={index}
                        dayNumber={dayData.day}
                        daysCount={days.length}
                        isMoving={isMoving}
                        onToggleMove={() =>
                          setMovingActivity(prev =>
                            prev?.activityId === item.id && prev?.fromDay === dayData.day
                              ? null
                              : { activityId: item.id, fromDay: dayData.day }
                          )
                        }
                        days={days}
                        onMoveToDay={handleMoveToDay}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                      />
                    );
                  })}
                </Reorder.Group>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed footer save button */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/40 px-5 z-20"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))', paddingTop: 12 }}
      >
        <button
          onClick={() => onSave(days)}
          className="w-full h-12 rounded-2xl text-[16px] font-bold transition-all active:scale-[0.98]"
          style={{
            background: '#9DCC36',
            color: '#141530',
          }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
