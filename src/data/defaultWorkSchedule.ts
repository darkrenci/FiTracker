import { WorkScheduleConfig, WorkDayShift, DayActivityType, SleepRecoveryProfile } from '../types/workSchedule';

export const DAYS_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface ActivityPresetOption {
  type: DayActivityType;
  label: string;
  icon: string;
  description: string;
  defaultStart: string;
  defaultEnd: string;
  badgeColor: string;
}

export const ACTIVITY_PRESET_OPTIONS: ActivityPresetOption[] = [
  {
    type: 'office_work',
    label: 'Office Work',
    icon: '💼',
    description: 'Corporate office / desk work with sitting intervals',
    defaultStart: '07:00',
    defaultEnd: '18:00',
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  {
    type: 'graduate_school',
    label: 'Graduate School & Classes',
    icon: '🎓',
    description: 'Master’s / PhD university lectures, seminars & coursework',
    defaultStart: '08:00',
    defaultEnd: '17:00',
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  },
  {
    type: 'study_research',
    label: 'Deep Study & Thesis',
    icon: '📚',
    description: 'Library research, thesis writing & exam preparation',
    defaultStart: '08:30',
    defaultEnd: '16:30',
    badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  },
  {
    type: 'remote_work',
    label: 'Remote / Work From Home',
    icon: '💻',
    description: 'Home office desk work with flexible stretching breaks',
    defaultStart: '08:00',
    defaultEnd: '17:00',
    badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  },
  {
    type: 'fitness_training',
    label: 'Dedicated Training Day',
    icon: '🏃',
    description: 'Focused workout, running long distance, or gym training',
    defaultStart: '07:00',
    defaultEnd: '10:00',
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  {
    type: 'rest_recovery',
    label: 'Rest & Recovery',
    icon: '☕',
    description: 'Active recovery, walking stroll, and mental decompression',
    defaultStart: '09:00',
    defaultEnd: '17:00',
    badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  },
];

export const DEFAULT_WORK_SHIFTS: Record<number, WorkDayShift> = {
  // 0 = Sunday (Rest / Active Recovery)
  0: {
    dayOfWeek: 0,
    dayName: 'Sunday',
    isWorkDay: false,
    activityType: 'rest_recovery',
    customTitle: 'Sunday Rest & Active Recovery',
    workStartTime: '09:00',
    workEndTime: '17:00',
    workType: 'office_desk',
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    includePreActivityExercise: true,
    includeMidMorningStretch: false,
    includeLunchWalk: true,
    includeAfternoonEnergyBreak: false,
    includePostActivityWorkout: false,
    preferredWorkoutTime: 'pre_work',
    notes: 'Rest day with morning endurance run or family stroll.',
  },
  // 1 = Monday (7:00 AM - 6:00 PM Office Work)
  1: {
    dayOfWeek: 1,
    dayName: 'Monday',
    isWorkDay: true,
    activityType: 'office_work',
    customTitle: 'Office Work Shift (7 AM - 6 PM)',
    workStartTime: '07:00',
    workEndTime: '18:00',
    workType: 'office_desk',
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    includePreActivityExercise: true,
    includeMidMorningStretch: true,
    includeLunchWalk: true,
    includeAfternoonEnergyBreak: true,
    includePostActivityWorkout: true,
    preferredWorkoutTime: 'post_work',
    notes: 'Standard 11-hour office shift. Pre-shift morning walk + post-shift run.',
  },
  // 2 = Tuesday (7:00 AM - 6:00 PM Office Work)
  2: {
    dayOfWeek: 2,
    dayName: 'Tuesday',
    isWorkDay: true,
    activityType: 'office_work',
    customTitle: 'Office Work Shift (7 AM - 6 PM)',
    workStartTime: '07:00',
    workEndTime: '18:00',
    workType: 'office_desk',
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    includePreActivityExercise: true,
    includeMidMorningStretch: true,
    includeLunchWalk: true,
    includeAfternoonEnergyBreak: true,
    includePostActivityWorkout: true,
    preferredWorkoutTime: 'post_work',
    notes: 'Desk posture resets and mid-morning lumbar stretches.',
  },
  // 3 = Wednesday (7:00 AM - 6:00 PM Office Work)
  3: {
    dayOfWeek: 3,
    dayName: 'Wednesday',
    isWorkDay: true,
    activityType: 'office_work',
    customTitle: 'Office Work Shift (7 AM - 6 PM)',
    workStartTime: '07:00',
    workEndTime: '18:00',
    workType: 'office_desk',
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    includePreActivityExercise: true,
    includeMidMorningStretch: true,
    includeLunchWalk: true,
    includeAfternoonEnergyBreak: true,
    includePostActivityWorkout: true,
    preferredWorkoutTime: 'post_work',
    notes: 'Midweek cardio reset and post-work running session.',
  },
  // 4 = Thursday (7:00 AM - 6:00 PM Office Work)
  4: {
    dayOfWeek: 4,
    dayName: 'Thursday',
    isWorkDay: true,
    activityType: 'office_work',
    customTitle: 'Office Work Shift (7 AM - 6 PM)',
    workStartTime: '07:00',
    workEndTime: '18:00',
    workType: 'office_desk',
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    includePreActivityExercise: true,
    includeMidMorningStretch: true,
    includeLunchWalk: true,
    includeAfternoonEnergyBreak: true,
    includePostActivityWorkout: true,
    preferredWorkoutTime: 'post_work',
    notes: 'Afternoon stair climb and hydration checks.',
  },
  // 5 = Friday (7:00 AM - 6:00 PM Office Work)
  5: {
    dayOfWeek: 5,
    dayName: 'Friday',
    isWorkDay: true,
    activityType: 'office_work',
    customTitle: 'Office Work Shift (7 AM - 6 PM)',
    workStartTime: '07:00',
    workEndTime: '18:00',
    workType: 'office_desk',
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    includePreActivityExercise: true,
    includeMidMorningStretch: true,
    includeLunchWalk: true,
    includeAfternoonEnergyBreak: true,
    includePostActivityWorkout: true,
    preferredWorkoutTime: 'post_work',
    notes: 'End of workweek cardio run and posture mobility.',
  },
  // 6 = Saturday (Graduate School / Master's Classes)
  6: {
    dayOfWeek: 6,
    dayName: 'Saturday',
    isWorkDay: true,
    activityType: 'graduate_school',
    customTitle: 'Saturday Graduate School & Lectures',
    workStartTime: '08:00',
    workEndTime: '17:00',
    workType: 'classroom_lecture',
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    includePreActivityExercise: true, // Pre-grad school mental clarity walk (e.g. 7:15 AM)
    includeMidMorningStretch: true, // Lecture break & spine reset (10:15 AM)
    includeLunchWalk: true, // Campus digestive walk (12:30 PM)
    includeAfternoonEnergyBreak: true, // Afternoon seminar stretch (3:15 PM)
    includePostActivityWorkout: true, // Post-grad school stress-relief jog (5:30 PM)
    preferredWorkoutTime: 'post_work',
    notes: 'Graduate school classes/lectures. Focus on cognitive clarity walks & lecture break spine resets.',
  },
};

export const DEFAULT_SLEEP_PROFILE: SleepRecoveryProfile = {
  targetBedtime: '23:30',
  actualSleptAt: '00:00', // e.g. 12:00 AM midnight
  isLateSleepMode: true,
  wakeUpTime: '06:45',
  morningRoutineType: 'gentle_circadian_walk',
  includePowerNapOrNSDR: true,
  napTime: '12:45',
  recoveryBedtime: '22:30',
  delayCaffeineMinutes: 90,
  hydrationElectrolytesBoost: true,
};

export const DEFAULT_WORK_CONFIG: WorkScheduleConfig = {
  defaultStartTime: '07:00',
  defaultEndTime: '18:00',
  jobTitle: 'Office Professional & Graduate Student',
  shifts: DEFAULT_WORK_SHIFTS,
  sleepRecovery: DEFAULT_SLEEP_PROFILE,
};
