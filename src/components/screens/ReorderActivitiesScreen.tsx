import React, { useState, useCallback, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Reorder, useDragControls } from 'framer-motion';
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
}: ActivityRowProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={`activity-${item.id}`}
      dragListener={false}
      dragControls={controls}
      className="touch-manipulation mb-2 relative"
      whileDrag={{ scale: 1.03, zIndex: 50 }}
    >
      <div
        className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3.5 shadow-sm"
        style={{ border: '1px solid hsl(var(--border))' }}
      >
        <div
          onPointerDown={(e) => {
            controls.start(e);
          }}
          className="flex-shrink-0 text-muted-foreground/50 cursor-grab active:cursor-grabbing p-1 -ml-1"
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

// Flat Item type
type FlatItem = 
  | { type: 'header'; id: string; day: number; date: Date; dayData: DayActivities }
  | { type: 'activity'; id: string; day: number; activity: Activity; index: number };

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

  const toggleCollapse = (day: number) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

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

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];
    days.forEach(d => {
      items.push({ id: `header-${d.day}`, type: 'header', day: d.day, date: d.date, dayData: d });
      if (!collapsedDays.has(d.day)) {
        d.activities.forEach((a, idx) => {
          items.push({ id: `activity-${a.id}`, type: 'activity', day: d.day, activity: a, index: idx });
        });
      }
    });
    return items;
  }, [days, collapsedDays]);

  const itemIds = useMemo(() => flatItems.map(i => i.id), [flatItems]);

  const handleReorder = (newIds: string[]) => {
    const activitiesById = new Map<string, Activity>();
    days.forEach(d => d.activities.forEach(a => activitiesById.set(String(a.id), a)));
    
    const newDays: DayActivities[] = [];
    let currentDay: DayActivities | null = null;
    const orphans: Activity[] = [];
    
    for (const id of newIds) {
      if (id.startsWith('header-')) {
        const dayNumStr = id.replace('header-', '');
        const originalDay = days.find(d => String(d.day) === dayNumStr);
        if (originalDay) {
          currentDay = {
            day: originalDay.day,
            date: originalDay.date,
            activities: []
          };
          if (collapsedDays.has(originalDay.day)) {
            currentDay.activities.push(...originalDay.activities);
          }
          newDays.push(currentDay);
        }
      } else if (id.startsWith('activity-')) {
        const actIdStr = id.replace('activity-', '');
        const activity = activitiesById.get(actIdStr);
        if (activity) {
          if (currentDay) {
            currentDay.activities.push(activity);
          } else {
            orphans.push(activity);
          }
        }
      }
    }
    
    if (orphans.length > 0 && newDays.length > 0) {
      newDays[0].activities.unshift(...orphans);
    }
    
    newDays.sort((a, b) => Number(a.day) - Number(b.day));
    
    setDays(newDays);
  };

  return (
    <div
      className="flex flex-col h-full bg-background"
      style={{ fontFamily: 'var(--font-family-primary)' }}
    >
      <header className="sticky top-0 z-20 bg-background px-5 pb-3">
        <div className="flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0">Reordenar</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-28" style={{ paddingTop: 20 }}>
        <Reorder.Group
          axis="y"
          values={itemIds}
          onReorder={handleReorder}
          className="flex flex-col"
        >
          {flatItems.map((item) => {
            if (item.type === 'header') {
              const weekday = format(item.date, 'EEE', { locale: ptBR });
              const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
              const dateStr = format(item.date, "d 'de' MMM", { locale: ptBR });
              const isCollapsed = collapsedDays.has(item.day);
              const actCount = item.dayData.activities.length;

              return (
                <Reorder.Item
                  key={item.id}
                  value={item.id}
                  dragListener={false}
                  className="mb-3 mt-4 first:mt-0 relative z-10"
                >
                  <div className="rounded-xl transition-all">
                    <button
                      onClick={() => toggleCollapse(item.day)}
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
                          style={{ backgroundColor: '#1A1C40', color: '#FFFFFF' }}
                        >
                          {item.day}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-[15px] font-bold text-foreground">
                            {capitalizedWeekday}, {dateStr}
                          </span>
                          <span className="text-[12px] font-medium text-muted-foreground mt-0.5">
                            {actCount} {actCount === 1 ? 'atividade' : 'atividades'}
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
                </Reorder.Item>
              );
            }

            const isMoving = movingActivity?.activityId === item.activity.id && movingActivity?.fromDay === item.day;
            
            return (
              <ActivityRow
                key={item.id}
                item={item.activity}
                index={item.index}
                dayNumber={item.day}
                daysCount={days.length}
                isMoving={isMoving}
                onToggleMove={() =>
                  setMovingActivity(prev =>
                    prev?.activityId === item.activity.id && prev?.fromDay === item.day
                      ? null
                      : { activityId: item.activity.id, fromDay: item.day }
                  )
                }
                days={days}
                onMoveToDay={handleMoveToDay}
              />
            );
          })}
        </Reorder.Group>
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

