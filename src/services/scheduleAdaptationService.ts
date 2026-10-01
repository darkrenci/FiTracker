import { ReminderItem } from '../types/notifications';
import { WorkScheduleConfig, WorkDayShift } from '../types/workSchedule';
import { notificationService } from './notificationService';

export interface LateWorkoutStatus {
  hasLateWorkout: boolean;
  overdueWorkout: ReminderItem | null;
  overdueMinutes: number;
  isSignificantlyLate: boolean; // >= 15 mins overdue
  subsequentReminders: ReminderItem[];
  currentClockMinutes: number;
  scheduledMinutes: number;
}

export interface ShiftPlanPreview {
  reminderId: string;
  title: string;
  originalTime: string;
  newTime: string;
  shiftDeltaMinutes: number;
}

export class ScheduleAdaptationService {
  public static timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  public static minutesToTime(mins: number): string {
    const normalized = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  public static formatTime12h(timeStr: string): string {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Evaluates today's reminders to find any exercise/workout that hasn't started or started late.
   */
  public static detectLateStatus(
    reminders: ReminderItem[],
    dayOfWeek: number,
    simulatedNowMinutes?: number
  ): LateWorkoutStatus {
    const now = new Date();
    const nowMins = simulatedNowMinutes ?? (now.getHours() * 60 + now.getMinutes());

    // Filter today's enabled uncompleted, unskipped reminders
    const todayReminders = reminders
      .filter((r) => r.enabled && r.daysOfWeek.includes(dayOfWeek))
      .sort((a, b) => this.timeToMinutes(a.time) - this.timeToMinutes(b.time));

    let overdueWorkout: ReminderItem | null = null;
    let maxOverdueMins = 0;

    for (const rem of todayReminders) {
      if (rem.completedToday || rem.skippedToday) continue;

      const remMins = this.timeToMinutes(rem.time);
      const diff = nowMins - remMins;

      // If scheduled time was more than 10 minutes ago, user hasn't started or is late
      if (diff >= 10) {
        if (!overdueWorkout || diff > maxOverdueMins) {
          overdueWorkout = rem;
          maxOverdueMins = diff;
        }
      }
    }

    if (!overdueWorkout) {
      return {
        hasLateWorkout: false,
        overdueWorkout: null,
        overdueMinutes: 0,
        isSignificantlyLate: false,
        subsequentReminders: [],
        currentClockMinutes: nowMins,
        scheduledMinutes: 0,
      };
    }

    const overdueScheduledMins = this.timeToMinutes(overdueWorkout.time);

    // Find subsequent uncompleted reminders that occur after this overdue item
    const subsequentReminders = todayReminders.filter(
      (r) =>
        r.id !== overdueWorkout!.id &&
        !r.completedToday &&
        !r.skippedToday &&
        this.timeToMinutes(r.time) >= overdueScheduledMins
    );

    return {
      hasLateWorkout: true,
      overdueWorkout,
      overdueMinutes: maxOverdueMins,
      isSignificantlyLate: maxOverdueMins >= 15,
      subsequentReminders,
      currentClockMinutes: nowMins,
      scheduledMinutes: overdueScheduledMins,
    };
  }

  /**
   * Generates a preview of how subsequent reminders will shift if delayed by `shiftMinutes`.
   */
  public static previewShift(
    overdueWorkout: ReminderItem,
    subsequentReminders: ReminderItem[],
    shiftMinutes: number
  ): ShiftPlanPreview[] {
    const previews: ShiftPlanPreview[] = [];

    // Also update overdue workout's start time to current time
    const origMins = this.timeToMinutes(overdueWorkout.time);
    previews.push({
      reminderId: overdueWorkout.id,
      title: overdueWorkout.title,
      originalTime: overdueWorkout.time,
      newTime: this.minutesToTime(origMins + shiftMinutes),
      shiftDeltaMinutes: shiftMinutes,
    });

    for (const sub of subsequentReminders) {
      const sm = this.timeToMinutes(sub.time);
      previews.push({
        reminderId: sub.id,
        title: sub.title,
        originalTime: sub.time,
        newTime: this.minutesToTime(sm + shiftMinutes),
        shiftDeltaMinutes: shiftMinutes,
      });
    }

    return previews;
  }

  /**
   * Applies the forward shift to today's subsequent reminders and updates notification alarms.
   */
  public static async applyShiftToReminders(
    allReminders: ReminderItem[],
    previews: ShiftPlanPreview[]
  ): Promise<ReminderItem[]> {
    const previewMap = new Map(previews.map((p) => [p.reminderId, p.newTime]));

    const updatedList = allReminders.map((r) => {
      if (previewMap.has(r.id)) {
        return {
          ...r,
          time: previewMap.get(r.id)!,
        };
      }
      return r;
    });

    // Save each updated reminder to local storage / notifications
    for (const preview of previews) {
      await notificationService.updateReminder(preview.reminderId, {
        time: preview.newTime,
      });
    }

    return updatedList;
  }

  /**
   * Compresses an overdue workout to an Express 15-min or 20-min session.
   * This allows the user to finish quickly without delaying subsequent schedule.
   */
  public static async compressWorkoutToExpress(
    allReminders: ReminderItem[],
    overdueWorkoutId: string,
    expressDuration = 15
  ): Promise<ReminderItem[]> {
    const updated = allReminders.map((r) => {
      if (r.id === overdueWorkoutId) {
        const cleanTitle = r.title.replace(/^\[Express \d+m\]\s*/, '');
        return {
          ...r,
          title: `⚡ [Express ${expressDuration}m] ${cleanTitle}`,
          durationMinutes: expressDuration,
          message: `Quick high-efficiency ${expressDuration}-minute express workout. Focus on continuous flow, mobility, and elevating heart rate without falling behind schedule!`,
        };
      }
      return r;
    });

    const target = updated.find((r) => r.id === overdueWorkoutId);
    if (target) {
      await notificationService.updateReminder(overdueWorkoutId, {
        title: target.title,
        durationMinutes: target.durationMinutes,
        message: target.message,
      });
    }

    return updated;
  }

  /**
   * Moves a missed or overdue morning workout to Lunch Break (12:30 PM) or Post-Work/Evening (18:15 PM).
   */
  public static async rescheduleWorkoutToSlot(
    allReminders: ReminderItem[],
    targetWorkoutId: string,
    newTime: string,
    slotName: 'lunch' | 'evening'
  ): Promise<ReminderItem[]> {
    const updated = allReminders.map((r) => {
      if (r.id === targetWorkoutId) {
        const cleanTitle = r.title
          .replace(/^\[Lunch Make-Up\]\s*/, '')
          .replace(/^\[Evening Make-Up\]\s*/, '')
          .replace(/^⚡\s*/, '');

        const slotPrefix = slotName === 'lunch' ? '[Lunch Make-Up]' : '[Evening Make-Up]';
        return {
          ...r,
          time: newTime,
          title: `${slotPrefix} ${cleanTitle}`,
          message: `Rescheduled workout from earlier today. Stay consistent with your health goals without rushing!`,
        };
      }
      return r;
    });

    const target = updated.find((r) => r.id === targetWorkoutId);
    if (target) {
      await notificationService.updateReminder(targetWorkoutId, {
        time: target.time,
        title: target.title,
        message: target.message,
      });
    }

    return updated;
  }

  /**
   * Auto-rebalances today's remaining workouts intelligently around the user's shift.
   */
  public static async autoRebalanceToday(
    allReminders: ReminderItem[],
    dayOfWeek: number,
    workConfig: WorkScheduleConfig
  ): Promise<{ updatedReminders: ReminderItem[]; shiftedCount: number; message: string }> {
    const shift: WorkDayShift | undefined = workConfig.shifts[dayOfWeek];
    const now = new Date();
    let currentMins = now.getHours() * 60 + now.getMinutes();

    // Give a 5-minute buffer from now
    currentMins = Math.max(currentMins + 5, 360); // at least 6:00 AM

    const todayReminders = allReminders
      .filter((r) => r.enabled && r.daysOfWeek.includes(dayOfWeek) && !r.completedToday && !r.skippedToday)
      .sort((a, b) => this.timeToMinutes(a.time) - this.timeToMinutes(b.time));

    if (todayReminders.length === 0) {
      return {
        updatedReminders: allReminders,
        shiftedCount: 0,
        message: 'No remaining workouts to rebalance today.',
      };
    }

    let cursorMins = currentMins;
    const updates: { id: string; newTime: string }[] = [];

    for (const rem of todayReminders) {
      const origMins = this.timeToMinutes(rem.time);
      let targetMins = origMins;

      // If scheduled in the past or conflicts with work shift
      if (targetMins < cursorMins) {
        targetMins = cursorMins;
      }

      // If user has an active work shift and this is during work (and not a designated lunch break)
      if (shift && shift.isWorkDay) {
        const workStart = this.timeToMinutes(shift.workStartTime);
        const workEnd = this.timeToMinutes(shift.workEndTime);
        const lunchStart = this.timeToMinutes(shift.lunchBreakStart);
        const lunchEnd = this.timeToMinutes(shift.lunchBreakEnd);

        // If it lands in the middle of deep work and is a heavy workout, push to lunch or post-work
        if (['workout', 'running'].includes(rem.category)) {
          if (targetMins >= workStart && targetMins < lunchStart) {
            targetMins = lunchStart + 10; // place in lunch window
          } else if (targetMins >= lunchEnd && targetMins < workEnd) {
            targetMins = workEnd + 15; // place right after work
          }
        }
      }

      // Cap at 22:30 so it doesn't disturb bedtime
      targetMins = Math.min(targetMins, 22 * 60 + 30);

      const newTimeStr = this.minutesToTime(targetMins);
      if (newTimeStr !== rem.time) {
        updates.push({ id: rem.id, newTime: newTimeStr });
      }

      // Increment cursor for the next reminder
      const dur = rem.durationMinutes || 25;
      cursorMins = targetMins + dur + 15; // workout duration + 15 min buffer
    }

    if (updates.length === 0) {
      return {
        updatedReminders: allReminders,
        shiftedCount: 0,
        message: 'Your remaining schedule is already well-spaced!',
      };
    }

    const updateMap = new Map(updates.map((u) => [u.id, u.newTime]));
    const updatedList = allReminders.map((r) => {
      if (updateMap.has(r.id)) {
        return { ...r, time: updateMap.get(r.id)! };
      }
      return r;
    });

    for (const u of updates) {
      await notificationService.updateReminder(u.id, { time: u.newTime });
    }

    return {
      updatedReminders: updatedList,
      shiftedCount: updates.length,
      message: `Intelligently rebalanced ${updates.length} workouts to fit the rest of your day.`,
    };
  }
}
