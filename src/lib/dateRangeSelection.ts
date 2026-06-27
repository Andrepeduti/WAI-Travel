import type { DateRange } from 'react-day-picker';

/**
 * Smart range selection: if a range is already complete (from+to),
 * clicking a new day resets the selection with that day as the new start.
 */
export function resolveNextRange(
  currentRange: DateRange | undefined,
  newRange: DateRange | undefined,
  selectedDay: Date
): { range: DateRange | undefined; isComplete: boolean } {
  // If current range is complete, reset to new start
  if (currentRange?.from && currentRange?.to) {
    return {
      range: { from: selectedDay, to: undefined },
      isComplete: false,
    };
  }

  // Otherwise accept what DayPicker gives us
  const isComplete = !!(newRange?.from && newRange?.to);
  return { range: newRange, isComplete };
}

