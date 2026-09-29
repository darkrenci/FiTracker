import { ReminderCategory, ReminderItem, UserPreferences } from '../types/notifications';

export type SchedulingConflictType =
  | 'direct_overlap'
  | 'meal_workout_proximity'
  | 'workout_sleep_interference'
  | 'insufficient_recovery'
  | 'late_night_nutrition';

export type ConflictSeverity = 'critical' | 'warning' | 'optimization';

export interface ProposedAdjustment {
  targetReminderId: string;
  targetReminderTitle: string;
  originalTime: string;
  newTime: string;
  newDuration?: number;
  description: string;
}

export interface SmartSuggestion {
  id: string;
  title: string;
  conflictType: SchedulingConflictType;
  severity: ConflictSeverity;
  affectedDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  affectedDayNames: string[];
  itemA: ReminderItem;
  itemB: ReminderItem;
  explanation: string;
  scientificRationale: string;
  primaryAdjustment: ProposedAdjustment;
  alternativeAdjustment?: ProposedAdjustment;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to convert "HH:mm" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Helper to convert minutes from midnight to "HH:mm"
export function minutesToTime(mins: number): string {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

const WORKOUT_CATEGORIES: ReminderCategory[] = ['workout', 'walking', 'running'];

export class SmartSuggestionEngine {
  /**
   * Analyzes all active reminders across the week and returns optimal suggestions
   */
  public static analyzeSchedule(
    reminders: ReminderItem[],
    preferences?: UserPreferences
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const activeReminders = reminders.filter((r) => r.enabled);

    // Analyze day by day (0 to 6)
    for (let day = 0; day < 7; day++) {
      const dayReminders = activeReminders.filter((r) => r.daysOfWeek.includes(day));

      // Sort chronologically by start time
      dayReminders.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

      for (let i = 0; i < dayReminders.length; i++) {
        for (let j = i + 1; j < dayReminders.length; j++) {
          const itemA = dayReminders[i];
          const itemB = dayReminders[j];

          const startA = timeToMinutes(itemA.time);
          const durA = itemA.durationMinutes || 30;
          const endA = startA + durA;

          const startB = timeToMinutes(itemB.time);
          const durB = itemB.durationMinutes || 30;
          const endB = startB + durB;

          const isWorkoutA = WORKOUT_CATEGORIES.includes(itemA.category);
          const isWorkoutB = WORKOUT_CATEGORIES.includes(itemB.category);
          const isMealA = itemA.category === 'meal';
          const isMealB = itemB.category === 'meal';
          const isSleepA = itemA.category === 'sleep';
          const isSleepB = itemB.category === 'sleep';

          // 1. Direct Time Overlap Check (startB < endA)
          if (startB < endA) {
            // Direct collision!
            const isMealWorkoutOverlap = (isWorkoutA && isMealB) || (isWorkoutB && isMealA);
            const workoutItem = isWorkoutA ? itemA : itemB;
            const mealItem = isMealA ? itemA : itemB;

            if (isMealWorkoutOverlap) {
              const suggestionId = `overlap-meal-workout-${workoutItem.id}-${mealItem.id}`;
              // Avoid duplicate across days by grouping
              const existing = suggestions.find((s) => s.id === suggestionId);
              if (existing) {
                if (!existing.affectedDays.includes(day)) {
                  existing.affectedDays.push(day);
                  existing.affectedDayNames.push(DAY_NAMES[day]);
                }
              } else {
                // Compute optimal shifted time for meal (start after workout + 15 min buffer)
                const workoutEnd = timeToMinutes(workoutItem.time) + (workoutItem.durationMinutes || 45);
                const optimalMealTime = minutesToTime(workoutEnd + 15);

                // Or alternative: shift workout earlier
                const optimalWorkoutTime = minutesToTime(timeToMinutes(mealItem.time) - (workoutItem.durationMinutes || 45) - 15);

                suggestions.push({
                  id: suggestionId,
                  title: `Direct Conflict: ${workoutItem.title} & ${mealItem.title}`,
                  conflictType: 'direct_overlap',
                  severity: 'critical',
                  affectedDays: [day],
                  affectedDayNames: [DAY_NAMES[day]],
                  itemA: workoutItem,
                  itemB: mealItem,
                  explanation: `On ${DAY_NAMES[day]}, ${workoutItem.title} (${formatTime12h(workoutItem.time)}, ${workoutItem.durationMinutes || 45}m) collides with ${mealItem.title} (${formatTime12h(mealItem.time)}).`,
                  scientificRationale:
                    'Exercising while digesting a meal diverts blood flow away from active skeletal muscle to the gastrointestinal tract, causing cramps, sluggishness, and reduced caloric expenditure. Postponing the meal provides ideal 30-min anabolic recovery nutrition.',
                  primaryAdjustment: {
                    targetReminderId: mealItem.id,
                    targetReminderTitle: mealItem.title,
                    originalTime: mealItem.time,
                    newTime: optimalMealTime,
                    description: `Shift ${mealItem.title} to ${formatTime12h(optimalMealTime)} (15 min after workout completion for post-exercise recovery)`,
                  },
                  alternativeAdjustment: {
                    targetReminderId: workoutItem.id,
                    targetReminderTitle: workoutItem.title,
                    originalTime: workoutItem.time,
                    newTime: optimalWorkoutTime,
                    description: `Move ${workoutItem.title} earlier to ${formatTime12h(optimalWorkoutTime)}`,
                  },
                });
              }
            } else {
              // General collision between any two reminders
              const suggestionId = `overlap-general-${itemA.id}-${itemB.id}`;
              const existing = suggestions.find((s) => s.id === suggestionId);
              if (existing) {
                if (!existing.affectedDays.includes(day)) {
                  existing.affectedDays.push(day);
                  existing.affectedDayNames.push(DAY_NAMES[day]);
                }
              } else {
                const shiftedTimeB = minutesToTime(endA + 10);
                suggestions.push({
                  id: suggestionId,
                  title: `Overlapping Reminders: ${itemA.title} & ${itemB.title}`,
                  conflictType: 'direct_overlap',
                  severity: 'critical',
                  affectedDays: [day],
                  affectedDayNames: [DAY_NAMES[day]],
                  itemA,
                  itemB,
                  explanation: `${itemA.title} (${formatTime12h(itemA.time)}) overlaps with ${itemB.title} (${formatTime12h(itemB.time)}).`,
                  scientificRationale:
                    'Simultaneous notifications cause alert fatigue and force skipping one activity. Staggering ensures full adherence.',
                  primaryAdjustment: {
                    targetReminderId: itemB.id,
                    targetReminderTitle: itemB.title,
                    originalTime: itemB.time,
                    newTime: shiftedTimeB,
                    description: `Reschedule ${itemB.title} to ${formatTime12h(shiftedTimeB)} (after ${itemA.title} concludes)`,
                  },
                });
              }
            }
          }

          // 2. Meal-to-Workout Tight Proximity Buffer (< 15 min buffer between finishing workout and eating dinner/snack)
          if (startB >= endA && startB - endA < 15) {
            const isMealWorkoutSequence = (isWorkoutA && isMealB);
            if (isMealWorkoutSequence) {
              const suggestionId = `proximity-buffer-${itemA.id}-${itemB.id}`;
              const existing = suggestions.find((s) => s.id === suggestionId);
              if (existing) {
                if (!existing.affectedDays.includes(day)) {
                  existing.affectedDays.push(day);
                  existing.affectedDayNames.push(DAY_NAMES[day]);
                }
              } else {
                const optimalDinner = minutesToTime(endA + 20);
                suggestions.push({
                  id: suggestionId,
                  title: `Zero Buffer: ${itemA.title} into ${itemB.title}`,
                  conflictType: 'meal_workout_proximity',
                  severity: 'warning',
                  affectedDays: [day],
                  affectedDayNames: [DAY_NAMES[day]],
                  itemA,
                  itemB,
                  explanation: `${itemA.title} ends at ${formatTime12h(minutesToTime(endA))}, leaving 0-${startB - endA} mins before ${itemB.title} (${formatTime12h(itemB.time)}).`,
                  scientificRationale:
                    'An immediate transition from intense movement into a seated meal prevents autonomic nervous system down-regulation (heart rate remains high, impairing digestive enzyme secretion). A 20-min buffer allows adequate cool-down, rehydration, and improved nutrient partitioning.',
                  primaryAdjustment: {
                    targetReminderId: itemB.id,
                    targetReminderTitle: itemB.title,
                    originalTime: itemB.time,
                    newTime: optimalDinner,
                    description: `Adjust ${itemB.title} to ${formatTime12h(optimalDinner)} (adds a restorative 20-min cool-down window)`,
                  },
                });
              }
            }
          }

          // 3. Late Workout vs Sleep / Wind-Down Interference
          if (isWorkoutA && isSleepB) {
            const gapToSleep = startB - endA;
            if (gapToSleep >= 0 && gapToSleep < 60) {
              const suggestionId = `sleep-interference-${itemA.id}-${itemB.id}`;
              const existing = suggestions.find((s) => s.id === suggestionId);
              if (existing) {
                if (!existing.affectedDays.includes(day)) {
                  existing.affectedDays.push(day);
                  existing.affectedDayNames.push(DAY_NAMES[day]);
                }
              } else {
                const recommendedWorkoutTime = minutesToTime(timeToMinutes(itemB.time) - (itemA.durationMinutes || 30) - 90);
                suggestions.push({
                  id: suggestionId,
                  title: `Sleep Disruption: ${itemA.title} too close to ${itemB.title}`,
                  conflictType: 'workout_sleep_interference',
                  severity: 'warning',
                  affectedDays: [day],
                  affectedDayNames: [DAY_NAMES[day]],
                  itemA,
                  itemB,
                  explanation: `${itemA.title} finishes only ${gapToSleep} mins before ${itemB.title} (${formatTime12h(itemB.time)}).`,
                  scientificRationale:
                    'Cardiovascular exercise raises core body temperature and elevates cortisol and epinephrine. Your body requires at least 90 minutes post-workout for core cooling and nocturnal melatonin secretion.',
                  primaryAdjustment: {
                    targetReminderId: itemA.id,
                    targetReminderTitle: itemA.title,
                    originalTime: itemA.time,
                    newTime: recommendedWorkoutTime,
                    description: `Shift ${itemA.title} earlier to ${formatTime12h(recommendedWorkoutTime)} to protect sleep architecture`,
                  },
                });
              }
            }
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Returns suggestions filtered for a specific day of week (0=Sun..6=Sat)
   */
  public static getDaySuggestions(
    allSuggestions: SmartSuggestion[],
    dayOfWeek: number
  ): SmartSuggestion[] {
    return allSuggestions.filter((s) => s.affectedDays.includes(dayOfWeek));
  }

  /**
   * Applies a proposed adjustment to the reminder list
   */
  public static applyAdjustment(
    reminders: ReminderItem[],
    adjustment: ProposedAdjustment
  ): { updatedReminders: ReminderItem[]; changedReminder: ReminderItem | null } {
    let changedReminder: ReminderItem | null = null;
    const updatedReminders = reminders.map((r) => {
      if (r.id === adjustment.targetReminderId) {
        changedReminder = {
          ...r,
          time: adjustment.newTime,
          durationMinutes: adjustment.newDuration ?? r.durationMinutes,
        };
        return changedReminder;
      }
      return r;
    });

    return { updatedReminders, changedReminder };
  }
}
