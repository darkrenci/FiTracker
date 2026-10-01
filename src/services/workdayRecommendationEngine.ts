import { WorkScheduleConfig, WorkdayHabitRecommendation, WorkDayShift } from '../types/workSchedule';
import { ReminderItem } from '../types/notifications';

function formatMinutesToTime(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export class WorkdayRecommendationEngine {
  /**
   * Generates tailored exercise, walking, and office/graduate school movement recommendations
   * based on the user's customized schedule across Monday through Sunday.
   */
  public static generateWorkdayPlan(config: WorkScheduleConfig): WorkdayHabitRecommendation[] {
    const recommendations: WorkdayHabitRecommendation[] = [];

    // Group days by activity category
    const officeDays: number[] = [];
    const gradSchoolDays: number[] = [];
    const studyDays: number[] = [];
    const remoteDays: number[] = [];
    const trainingDays: number[] = [];
    const restDays: number[] = [];

    for (let day = 0; day < 7; day++) {
      const shift = config.shifts[day];
      if (!shift || !shift.isWorkDay) {
        restDays.push(day);
        continue;
      }

      const actType = shift.activityType || 'office_work';
      if (actType === 'graduate_school') {
        gradSchoolDays.push(day);
      } else if (actType === 'study_research') {
        studyDays.push(day);
      } else if (actType === 'remote_work') {
        remoteDays.push(day);
      } else if (actType === 'fitness_training') {
        trainingDays.push(day);
      } else if (actType === 'rest_recovery') {
        restDays.push(day);
      } else {
        officeDays.push(day);
      }
    }

    // -------------------------------------------------------------
    // 1. OFFICE WORK ROUTINES (Mon - Fri or whichever days chosen)
    // -------------------------------------------------------------
    if (officeDays.length > 0) {
      const refOfficeShift = config.shifts[officeDays[0]] || {
        workStartTime: '07:00',
        workEndTime: '18:00',
        lunchBreakStart: '12:00',
      };

      const startMins = timeStringToMinutes(refOfficeShift.workStartTime);
      const endMins = timeStringToMinutes(refOfficeShift.workEndTime);
      const lunchMins = timeStringToMinutes(refOfficeShift.lunchBreakStart || '12:00');

      // Morning Awakening Walk
      const preWorkMins = Math.max(startMins - 45, 330);
      recommendations.push({
        id: 'rec-office-morning-walk',
        title: 'Morning Awakening Walk & Cardio',
        category: 'walking',
        time: formatMinutesToTime(preWorkMins),
        durationMinutes: 25,
        message: `Activate your metabolism and mental clarity before your ${refOfficeShift.workStartTime} office shift!`,
        rationale: 'A 20-25 minute brisk walk stimulates dopamine and cortisol rhythm, preventing morning fatigue during long office hours.',
        timingContext: 'pre_work',
        daysOfWeek: officeDays,
        isAlarm: true,
        soundPreset: 'pulse-energy',
        targetMetric: '25 min | ~3,000 steps',
        exerciseInstructions: [
          'Drink 300ml water upon waking',
          'Brisk outdoor walk or treadmill at 5.5 km/h',
          '3 gentle shoulder rolls and deep diaphragmatic breaths',
        ],
      });

      // Mid-Morning Office Mobility
      const midMorningMins = Math.round(startMins + (lunchMins - startMins) / 2);
      recommendations.push({
        id: 'rec-office-mobility-morning',
        title: 'Office Desk Mobility & Anti-Slouch Stretch',
        category: 'workout',
        time: formatMinutesToTime(midMorningMins),
        durationMinutes: 10,
        message: 'Time for a 10-minute office desk stretch! Reset your neck, shoulders, and lower back.',
        rationale: 'Sitting uninterrupted for over 2 hours causes cervical spine compression and tightens hip flexors.',
        timingContext: 'during_work',
        daysOfWeek: officeDays,
        isAlarm: true,
        soundPreset: 'zen-chime',
        targetMetric: '10 min mobility routine',
        exerciseInstructions: [
          'Seated Spinal Twist (hold 30s each side)',
          'Desk Chest Opener & Shoulder Retraction (15 reps)',
          'Standing Calf Raises by your desk (20 reps)',
          'Chin tucks to relieve computer neck strain',
        ],
      });

      // Lunch Digestive Walk
      const lunchWalkMins = lunchMins + 30;
      recommendations.push({
        id: 'rec-office-lunch-walk',
        title: 'Post-Lunch Digestive Walk',
        category: 'walking',
        time: formatMinutesToTime(lunchWalkMins),
        durationMinutes: 20,
        message: 'Step away from your desk for a brisk 20-minute post-lunch walk. Keep blood sugar steady!',
        rationale: 'Light ambulation after a midday meal reduces postprandial glucose spikes by up to 30% and prevents the afternoon slump.',
        timingContext: 'lunch_break',
        daysOfWeek: officeDays,
        isAlarm: true,
        soundPreset: 'dining-bell',
        targetMetric: '20 min | ~2,200 steps',
        exerciseInstructions: [
          'Walk outdoors or in corridors away from your desk',
          'Maintain an easy conversational pace',
          'Rest eyes on distant objects to relax screen strain',
        ],
      });

      // Afternoon Stair Climb & Calisthenics
      const afternoonMins = Math.round(lunchMins + 60 + (endMins - (lunchMins + 60)) / 2);
      recommendations.push({
        id: 'rec-office-afternoon-energy',
        title: 'Afternoon Office Stair Climb & Calisthenics',
        category: 'workout',
        time: formatMinutesToTime(afternoonMins),
        durationMinutes: 12,
        message: 'Defeat the 3:30 PM fatigue slump! Stand up, climb a flight of stairs, or do desk squats.',
        rationale: 'Brief bouts of stair climbing enhance cerebral blood flow more effectively than coffee without causing sleep disruption.',
        timingContext: 'during_work',
        daysOfWeek: officeDays,
        isAlarm: true,
        soundPreset: 'radar-ping',
        targetMetric: '12 min active movement',
        exerciseInstructions: [
          'Climb 2-3 flights of office stairs or brisk hallway walk',
          '15 Bodyweight Chair Squats',
          'Drink a cold 250ml glass of water',
          'Forearm and wrist extensions for typing relief',
        ],
      });

      // Post-Work Outdoor Run / Workout
      const postWorkMins = endMins + 45;
      // Mon, Wed, Fri or subset of office days
      const primaryRunDays = officeDays.filter((d) => [1, 3, 5].includes(d));
      const chosenDays = primaryRunDays.length > 0 ? primaryRunDays : officeDays;

      recommendations.push({
        id: 'rec-office-evening-workout',
        title: 'Post-Work Outdoor Run & Strength Session',
        category: 'running',
        time: formatMinutesToTime(postWorkMins),
        durationMinutes: 40,
        message: `Shift finished at ${refOfficeShift.workEndTime}! Time to shed workday stress with your evening cardio/run.`,
        rationale: 'High intensity cardio or running after a sedentary desk day stimulates endorphins and releases psychological tension from work.',
        timingContext: 'post_work',
        daysOfWeek: chosenDays,
        isAlarm: true,
        soundPreset: 'pulse-energy',
        targetMetric: '40 min | 5-6 km Run or Strength',
        exerciseInstructions: [
          '5 min dynamic warm up (leg swings, arm circles)',
          '30 min interval run or 5K pace jog (Strava tracking enabled)',
          '5 min cool down walk and hamstring stretch',
        ],
      });
    }

    // -------------------------------------------------------------
    // 2. GRADUATE SCHOOL & CLASSES ROUTINES (Saturday by default)
    // -------------------------------------------------------------
    if (gradSchoolDays.length > 0) {
      const refGradShift = config.shifts[gradSchoolDays[0]] || {
        workStartTime: '08:00',
        workEndTime: '17:00',
        lunchBreakStart: '12:00',
      };

      const gradStartMins = timeStringToMinutes(refGradShift.workStartTime);
      const gradEndMins = timeStringToMinutes(refGradShift.workEndTime);
      const gradLunchMins = timeStringToMinutes(refGradShift.lunchBreakStart || '12:00');

      // Pre-Graduate School Brain Awakening & Memory Focus Walk
      const preGradMins = Math.max(gradStartMins - 45, 330);
      recommendations.push({
        id: 'rec-gradschool-morning-focus',
        title: '🎓 Pre-Graduate School Brain Awakening Walk',
        category: 'walking',
        time: formatMinutesToTime(preGradMins),
        durationMinutes: 25,
        message: `Stimulate cognitive memory retention and mental clarity before your ${refGradShift.workStartTime} Saturday graduate school lectures begin!`,
        rationale: 'A morning brisk walk triggers Brain-Derived Neurotrophic Factor (BDNF) release by up to 30%, priming neural pathways for seminars, complex research analysis, and note-taking.',
        timingContext: 'pre_work',
        daysOfWeek: gradSchoolDays,
        isAlarm: true,
        soundPreset: 'pulse-energy',
        targetMetric: '25 min walk | ~3,000 steps',
        exerciseInstructions: [
          'Drink 350ml water + optional morning coffee/tea',
          'Brisk outdoor walk or campus stroll at 5.5 km/h',
          '3 deep neck rolls & cognitive breathwork to sharpen mental focus',
        ],
      });

      // Mid-Lecture Break Spine Reset & Eye Strain Relief
      const midGradMins = Math.round(gradStartMins + (gradLunchMins - gradStartMins) / 2);
      recommendations.push({
        id: 'rec-gradschool-lecture-break',
        title: '🎓 Lecture Break Stretch & Posture Reset',
        category: 'workout',
        time: formatMinutesToTime(midGradMins),
        durationMinutes: 10,
        message: 'Mid-lecture break! Step away from your notebook and slides. Reset your spine and re-oxygenate your brain.',
        rationale: 'Hours of intense lecture listening and looking down at laptops strains the cervical spine, while brief posture resets restore mental focus.',
        timingContext: 'during_work',
        daysOfWeek: gradSchoolDays,
        isAlarm: true,
        soundPreset: 'zen-chime',
        targetMetric: '10 min posture & spine reset',
        exerciseInstructions: [
          'Overhead spine extension & lateral side bends (10 reps)',
          '20-20-20 rule: look 20 feet away for 20 seconds to relieve screen/slide fatigue',
          'Shoulder blade contractions (15 reps) to open chest',
          'Hydrate with cold water from your bottle',
        ],
      });

      // Campus & Lunch Digestive Walk
      const gradLunchWalkMins = gradLunchMins + 30;
      recommendations.push({
        id: 'rec-gradschool-campus-walk',
        title: '🎓 Campus / Lunch Digestive Stroll',
        category: 'walking',
        time: formatMinutesToTime(gradLunchWalkMins),
        durationMinutes: 20,
        message: 'Step outside the seminar room for a 20-minute campus walk. Digest lunch and recharge for afternoon modules.',
        rationale: 'Natural daylight exposure prevents afternoon cognitive drowsiness and stabilizes blood glucose after a meal.',
        timingContext: 'lunch_break',
        daysOfWeek: gradSchoolDays,
        isAlarm: true,
        soundPreset: 'dining-bell',
        targetMetric: '20 min campus stroll | ~2,200 steps',
        exerciseInstructions: [
          'Walk outdoors around campus grounds or nearby park',
          'Breathe deeply in fresh outdoor air',
          'Light conversational pace to aid stomach motility',
        ],
      });

      // Afternoon Seminar Energy Boost & Stretch
      const afternoonGradMins = Math.round(gradLunchMins + 60 + (gradEndMins - (gradLunchMins + 60)) / 2);
      recommendations.push({
        id: 'rec-gradschool-afternoon-energy',
        title: '🎓 Afternoon Seminar Energy Boost & Stretch',
        category: 'workout',
        time: formatMinutesToTime(afternoonGradMins),
        durationMinutes: 10,
        message: 'Overcome late afternoon seminar fatigue! Stand up, stretch your hamstrings and lower back, and refresh your mental stamina.',
        rationale: 'Quick calisthenics and lower-body movement reverse venous pooling in the legs from seated lectures.',
        timingContext: 'during_work',
        daysOfWeek: gradSchoolDays,
        isAlarm: true,
        soundPreset: 'radar-ping',
        targetMetric: '10 min energy revival',
        exerciseInstructions: [
          'Standing quad and hamstring stretches (30s per leg)',
          '15 bodyweight squats or stair climbing',
          'Drink a full glass of cool water',
        ],
      });

      // Post-Graduate School Stress-Relief Run / Workout
      const postGradMins = gradEndMins + 30;
      recommendations.push({
        id: 'rec-gradschool-post-run',
        title: '🎓 Post-Graduate School Stress-Relief Run',
        category: 'running',
        time: formatMinutesToTime(postGradMins),
        durationMinutes: 35,
        message: `Graduate school classes complete at ${refGradShift.workEndTime}! Flush out academic cognitive tension with a refreshing jog or gym workout.`,
        rationale: 'Aerobic cardio and running flush out cortisol and mental fatigue built up from intense academic lectures and study.',
        timingContext: 'post_work',
        daysOfWeek: gradSchoolDays,
        isAlarm: true,
        soundPreset: 'pulse-energy',
        targetMetric: '35 min | 4-5 km run (Strava tracking enabled)',
        exerciseInstructions: [
          '5 min dynamic warmup (high knees, butt kicks, arm rotations)',
          '25 min continuous aerobic run (track GPS via Strava)',
          '5 min cooldown walk and hamstring stretches',
        ],
      });
    }

    // -------------------------------------------------------------
    // 3. STUDY & THESIS DAYS (if configured on any day)
    // -------------------------------------------------------------
    if (studyDays.length > 0) {
      recommendations.push({
        id: 'rec-study-focus-walk',
        title: '📚 Deep Study Focus Walk & Eye Break',
        category: 'walking',
        time: '14:30',
        durationMinutes: 20,
        message: 'Take a break from thesis writing and reading! Refresh working memory with a 20-minute walk.',
        rationale: 'Stepping away from research papers stimulates the default mode network, fostering creative insights for your research.',
        timingContext: 'during_work',
        daysOfWeek: studyDays,
        isAlarm: true,
        soundPreset: 'zen-chime',
        targetMetric: '20 min walk',
        exerciseInstructions: ['Unplug headphones', 'Walk in a quiet setting', 'Deep nasal breathing'],
      });
    }

    // -------------------------------------------------------------
    // 4. REST & ACTIVE RECOVERY DAYS (Sunday by default)
    // -------------------------------------------------------------
    if (restDays.length > 0) {
      recommendations.push({
        id: 'rec-weekend-recovery-run',
        title: 'Sunday Morning Endurance Run / Long Walk',
        category: 'running',
        time: '07:30',
        durationMinutes: 45,
        message: 'No office or graduate school pressure today! Enjoy an uninterrupted morning run or scenic long walk.',
        rationale: 'Aerobic base building session outside the constraints of weekday schedules. Boosts cardiovascular health and lung capacity.',
        timingContext: 'pre_work',
        daysOfWeek: restDays,
        isAlarm: true,
        soundPreset: 'pulse-energy',
        targetMetric: '45 min | 5-7 km run or long walk',
        exerciseInstructions: [
          'Zone 2 steady conversational pace',
          'GPS track with Strava integration',
          'Hydrate with electrolytes after finish',
        ],
      });

      recommendations.push({
        id: 'rec-weekend-mobility-stretch',
        title: 'Weekend Full Body Mobility & Foam Rolling',
        category: 'recovery',
        time: '16:00',
        durationMinutes: 20,
        message: 'Deep recovery session: relieve accumulated muscle tightness from weekday desk work and Saturday graduate lectures.',
        rationale: 'Myofascial release improves joint range of motion and prepares muscle fibers for the upcoming week.',
        timingContext: 'during_work',
        daysOfWeek: restDays,
        isAlarm: false,
        soundPreset: 'zen-chime',
        targetMetric: '20 min full body stretch',
        exerciseInstructions: [
          'Pigeon pose for glute & piriformis release (1 min each side)',
          'Couch stretch for tight hip flexors (1 min each side)',
          'Child pose and thoracic openers',
        ],
      });
    }

    // -------------------------------------------------------------
    // 5. DAILY NIGHT WIND-DOWN & DECOMPRESSION (All 7 Days)
    // -------------------------------------------------------------
    recommendations.push({
      id: 'rec-night-wind-down',
      title: 'Night Stroll & Sleep Preparation Walk',
      category: 'recovery',
      time: '21:00',
      durationMinutes: 20,
      message: 'Decompress from the day: 20-minute night stroll & gentle spinal stretches for restorative sleep.',
      rationale: 'Low-intensity evening movement lowers core body temperature and promotes melatonin secretion for deep sleep.',
      timingContext: 'evening',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      isAlarm: true,
      soundPreset: 'zen-chime',
      targetMetric: '20 min decompression',
      exerciseInstructions: [
        'Slow stroll outside without checking office or school emails',
        'Hamstring and hip flexor static stretches (30s hold)',
        'Dim phone brightness and prepare for quality rest',
      ],
    });

    // -------------------------------------------------------------
    // 6. LATE SLEEP (12 AM / 1 AM) ADAPTIVE RECOVERY ROUTINES
    // -------------------------------------------------------------
    const sleepProfile = config.sleepRecovery;
    const isLateSleep =
      sleepProfile?.isLateSleepMode !== false ||
      ['00:00', '00:30', '01:00', '01:30', '02:00'].includes(sleepProfile?.actualSleptAt || '00:00');

    if (isLateSleep) {
      // 1. Circadian Awakening Light Walk (e.g. 6:45 AM)
      const wakeMins = sleepProfile?.wakeUpTime ? timeStringToMinutes(sleepProfile.wakeUpTime) : 405; // 6:45 AM
      recommendations.push({
        id: 'rec-late-sleep-morning-circadian-walk',
        title: '🌅 Circadian Awakening Walk (Late Sleep Adapted)',
        category: 'walking',
        time: formatMinutesToTime(wakeMins),
        durationMinutes: 20,
        message: `Slept late at ${sleepProfile?.actualSleptAt || '12 AM / 1 AM'}? Replace exhausting morning HIIT with a gentle 20-min outdoor sunlight walk. Resets circadian rhythm and boosts dopamine without elevating cardiac stress.`,
        rationale: 'Exercising at maximum heart rate after short sleep drastically spikes cortisol and cardiac stress. Low-intensity sunlight walking safely resets sympathetic tone.',
        timingContext: 'pre_work',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        isAlarm: true,
        soundPreset: 'pulse-energy',
        targetMetric: '20 min outdoor walk | ~2,500 steps',
        exerciseInstructions: [
          'Drink 500ml water + pinch of sea salt upon waking',
          'Walk outdoors facing natural light (no sunglasses)',
          'Light nasal breathing to calm autonomic nervous system',
        ],
      });

      // 2. Delayed Caffeine Strategy (8:30 AM)
      recommendations.push({
        id: 'rec-late-sleep-delayed-caffeine',
        title: '☕ Optimal Caffeine & Vasopressin Hydration Window',
        category: 'hydration',
        time: '08:30',
        durationMinutes: 5,
        message: 'Optimal coffee window! Drinking caffeine 90 minutes after waking allows adenosine clearance, preventing the severe 2:00 PM afternoon crash.',
        rationale: 'Late sleep causes elevated adenosine. Drinking coffee too early blocks adenosine receptors temporarily, guaranteeing an energy crash later.',
        timingContext: 'during_work',
        daysOfWeek: [1, 2, 3, 4, 5, 6],
        isAlarm: true,
        soundPreset: 'water-drop',
        targetMetric: 'Caffeine optimization + 350ml water',
      });

      // 3. 15-Minute Restorative Power Nap / NSDR (12:45 PM)
      recommendations.push({
        id: 'rec-late-sleep-restorative-nsdr-nap',
        title: '🧘 15-Min Power Nap / NSDR (Sleep Debt Recovery)',
        category: 'recovery',
        time: sleepProfile?.napTime || '12:45',
        durationMinutes: 15,
        message: 'Late sleep recovery: 15-minute Non-Sleep Deep Rest (NSDR / Yoga Nidra) or power nap. Clears sleep debt and resets cognitive prefrontal focus!',
        rationale: 'Stanford research confirms a 15-minute midday restorative pause restores cognitive working memory as effectively as 1.5 hours of nighttime sleep.',
        timingContext: 'lunch_break',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        isAlarm: true,
        soundPreset: 'zen-chime',
        targetMetric: '15 min deep mental rest',
        exerciseInstructions: [
          'Lie down or lean back comfortably in an office chair',
          'Close eyes and practice 4-second inhale, 8-second slow exhale',
          'Do not exceed 25 minutes to avoid entering groggy slow-wave sleep',
        ],
      });

      // 4. Early Recovery Bedtime Alarm (10:30 PM)
      recommendations.push({
        id: 'rec-late-sleep-recovery-bedtime',
        title: '🌙 Catch-Up Deep Sleep Bedtime Alarm',
        category: 'recovery',
        time: sleepProfile?.recoveryBedtime || '22:30',
        durationMinutes: 20,
        message: `Early bedtime tonight at ${sleepProfile?.recoveryBedtime || '10:30 PM'}! Repay last night's ${sleepProfile?.actualSleptAt || '12 AM/1 AM'} sleep debt and maximize slow-wave deep restorative sleep.`,
        rationale: 'Slow-wave sleep (NREM 3) predominantly occurs before 2:00 AM. Sleeping by 10:30 PM ensures full hormonal reset and cellular repair.',
        timingContext: 'evening',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        isAlarm: true,
        soundPreset: 'zen-chime',
        targetMetric: '10:30 PM early recovery sleep',
        exerciseInstructions: [
          'Turn down phone brightness and avoid blue light',
          'Warm shower or bath to drop core body temperature',
          '3 gentle forward fold hamstring stretches',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Converts recommendations to concrete ReminderItems ready to schedule
   */
  public static convertToReminderItems(recommendations: WorkdayHabitRecommendation[]): ReminderItem[] {
    return recommendations.map((rec) => ({
      id: `rem-workday-${rec.id}-${Date.now().toString(36)}`,
      title: rec.title,
      category: rec.category,
      time: rec.time,
      daysOfWeek: rec.daysOfWeek,
      durationMinutes: rec.durationMinutes,
      message: rec.message,
      enabled: true,
      priority: 'high',
      soundPreset: rec.soundPreset,
      vibrate: true,
      repeatIntervalMinutes: 10,
      isAlarm: rec.isAlarm,
      completedToday: false,
      skippedToday: false,
      targetMetric: rec.targetMetric,
    }));
  }
}
