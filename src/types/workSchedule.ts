export type DayActivityType =
  | 'office_work'        // Office Desk Work (e.g. 7am - 6pm)
  | 'graduate_school'    // Graduate School / Master's / Classes
  | 'study_research'     // Deep Study / Thesis / Library
  | 'remote_work'        // Remote / Work From Home
  | 'field_work'         // Active / Standing / Field Work
  | 'rest_recovery'      // Rest & Active Recovery
  | 'fitness_training';  // Dedicated Training / Sports Day

export type WorkType = 'office_desk' | 'remote_desk' | 'standing' | 'active_field' | 'classroom_lecture';
export type PreferredWorkoutTime = 'pre_work' | 'lunch_break' | 'post_work';

export interface WorkDayShift {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  dayName: string;
  isWorkDay: boolean; // active scheduled day
  activityType: DayActivityType; // e.g. 'office_work', 'graduate_school', 'rest_recovery'
  customTitle?: string; // e.g. "Saturday Graduate School", "Office Shift", "Thesis Research"
  workStartTime: string; // "07:00" (24h)
  workEndTime: string; // "18:00" (24h)
  workType: WorkType;
  lunchBreakStart: string; // "12:00"
  lunchBreakEnd: string; // "13:00"
  includePreActivityExercise?: boolean; // morning awakening walk or workout
  includeMidMorningStretch: boolean; // mid-morning or mid-lecture stretch
  includeLunchWalk: boolean; // post-lunch digestive walk
  includeAfternoonEnergyBreak: boolean; // afternoon energy break / stair climb
  includePostActivityWorkout?: boolean; // post-work / post-grad school run or gym
  preferredWorkoutTime: PreferredWorkoutTime;
  notes?: string;
}

export interface SleepRecoveryProfile {
  targetBedtime: string; // "23:00", "00:00", "01:00"
  actualSleptAt?: string; // "00:00", "01:00"
  isLateSleepMode: boolean; // true if slept at 12 AM / 1 AM or later
  wakeUpTime: string; // "06:30" or "07:00"
  morningRoutineType: 'energizing_hiit' | 'gentle_circadian_walk' | 'restorative_stretch';
  includePowerNapOrNSDR: boolean; // 15-20 min afternoon restorative nap
  napTime: string; // "12:45"
  recoveryBedtime: string; // "22:30" for earlier recovery sleep
  delayCaffeineMinutes: number; // 90 mins after waking
  hydrationElectrolytesBoost: boolean; // Extra 500ml water + electrolytes
}

export interface WorkScheduleConfig {
  defaultStartTime: string; // "07:00"
  defaultEndTime: string; // "18:00"
  jobTitle?: string;
  companyOrLocation?: string;
  shifts: Record<number, WorkDayShift>;
  sleepRecovery?: SleepRecoveryProfile;
}

export interface WorkdayHabitRecommendation {
  id: string;
  title: string;
  category: 'workout' | 'walking' | 'running' | 'meal' | 'hydration' | 'recovery';
  time: string;
  durationMinutes: number;
  message: string;
  rationale: string;
  timingContext: 'pre_work' | 'during_work' | 'lunch_break' | 'post_work' | 'evening';
  daysOfWeek: number[];
  isAlarm: boolean;
  soundPreset: 'pulse-energy' | 'digital-beep' | 'zen-chime' | 'water-drop' | 'dining-bell' | 'military-bugle' | 'radar-ping';
  exerciseInstructions?: string[];
  targetMetric?: string;
}

export interface CompletedWorkoutRecord {
  id: string;
  reminderId?: string;
  title: string;
  category: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  distanceMeters?: number;
  distanceKm?: number;
  avgPaceSecondsPerKm?: number;
  avgPaceFormatted?: string;
  caloriesBurned: number;
  avgHeartRate?: number;
  stepsCount: number;
  stravaSynced: boolean;
  stravaActivityId?: string;
  userNotes?: string;
  recommendations: string[];
}
