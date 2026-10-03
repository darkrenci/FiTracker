import React, { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  Volume2,
  Database,
  ShieldAlert,
  Layers,
  Sparkles,
  Flame,
  Radio,
  Clock,
  Play,
  CheckCircle,
  HelpCircle,
  Settings,
  Share2,
  HardDrive,
  Briefcase,
  User,
  Menu,
  Sliders,
  Moon,
  Activity
} from 'lucide-react';
import {
  DeviceSubscription,
  NotificationLog,
  ReminderItem,
  SoundPreset,
  UserPreferences
} from './types/notifications';
import { INITIAL_PREFERENCES, INITIAL_REMINDERS } from './data/defaultSchedule';
import { notificationService } from './services/notificationService';
import { soundEngine } from './services/soundEngine';
import { localAuthService } from './services/localAuth';
import { LocalUserProfile } from './types/user';
import { WorkScheduleConfig, CompletedWorkoutRecord } from './types/workSchedule';
import { DEFAULT_WORK_CONFIG } from './data/defaultWorkSchedule';
import { GPXTrackPoint } from './services/stravaService';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { WorkoutAlarmModal } from './components/WorkoutAlarmModal';
import { ActiveWorkoutTracker } from './components/ActiveWorkoutTracker';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { LocalAuthModal } from './components/LocalAuthModal';
import { WorkSchedulePlanner } from './components/WorkSchedulePlanner';
import { OnboardingPermissionModal } from './components/OnboardingPermissionModal';
import { SoundSettingsPanel } from './components/SoundSettingsPanel';
import { ScheduleManager } from './components/ScheduleManager';
import { NotificationCenter } from './components/NotificationCenter';
import { DeviceSyncManager } from './components/DeviceSyncManager';
import { PhoneDatabaseManager } from './components/PhoneDatabaseManager';
import { AppInstallerModal } from './components/AppInstallerModal';
import { ReliabilityTestingSuite } from './components/ReliabilityTestingSuite';
import { NativeAppArchitecture } from './components/NativeAppArchitecture';
import { TodayWorkoutHub } from './components/TodayWorkoutHub';
import { AppMenuDrawer } from './components/AppMenuDrawer';
import { SleepRecoveryOptimizer } from './components/SleepRecoveryOptimizer';

export default function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'recommendations' | 'schedule' | 'work_schedule' | 'sounds' | 'history' | 'devices' | 'phone_db' | 'reliability' | 'native'>('today');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Local Database User Auth State
  const [currentUser, setCurrentUser] = useState<LocalUserProfile | null>(localAuthService.getCurrentUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [workConfig, setWorkConfig] = useState<WorkScheduleConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fitbudget_work_config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // fallback
        }
      }
    }
    return currentUser?.workSchedule || { ...DEFAULT_WORK_CONFIG };
  });

  // Data State
  const [reminders, setReminders] = useState<ReminderItem[]>([...INITIAL_REMINDERS]);
  const [preferences, setPreferences] = useState<UserPreferences>({ ...INITIAL_PREFERENCES });
  const [devices, setDevices] = useState<DeviceSubscription[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  // Modals & Workout Sessions
  const [activeAlarmReminder, setActiveAlarmReminder] = useState<ReminderItem | null>(null);
  const [activeWorkoutSession, setActiveWorkoutSession] = useState<ReminderItem | null>(null);
  const [completedWorkoutSummary, setCompletedWorkoutSummary] = useState<{
    record: CompletedWorkoutRecord;
    trackPoints: GPXTrackPoint[];
  } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAppInstallerModal, setShowAppInstallerModal] = useState(false);
  const [bannerAlert, setBannerAlert] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // Initialize data on mount
  useEffect(() => {
    // Check permission status
    setPermissionStatus(notificationService.getPermissionStatus());

    // Show onboarding if permission is default and user hasn't seen it
    const hasSeenOnboarding = localStorage.getItem('fitbudget_onboarding_completed');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    // Load from server
    fetchData();

    // Listen to Service Worker postMessages
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload, action, reminderId } = event.data || {};
        if (type === 'PUSH_NOTIFICATION_RECEIVED') {
          // Play in-app alarm chime if alarm
          if (payload?.isWorkoutAlarm) {
            const found = reminders.find((r) => r.id === payload.data?.reminderId);
            if (found) {
              setActiveAlarmReminder(found);
            }
          }
          fetchData();
        } else if (type === 'NOTIFICATION_ACTION_CLICKED') {
          if (action === 'start_workout') {
            const found = reminders.find((r) => r.id === reminderId);
            if (found) {
              setActiveWorkoutSession(found);
            }
          }
          fetchData();
        }
      });
    }

    // Check URL search params for deep linked actions from service worker clicks
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const reminderId = urlParams.get('reminderId') || urlParams.get('id');

    if (action === 'start_workout' && reminderId) {
      const found = reminders.find((r) => r.id === reminderId);
      if (found) setActiveWorkoutSession(found);
    } else if (action === 'open_reminder' && reminderId) {
      const found = reminders.find((r) => r.id === reminderId);
      if (found) setActiveAlarmReminder(found);
    }
  }, []);

  const fetchData = async () => {
    try {
      const [remList, prefs, devList, logList] = await Promise.all([
        notificationService.synchronizeReminders().catch(() => INITIAL_REMINDERS),
        notificationService.getPreferences().catch(() => INITIAL_PREFERENCES),
        notificationService.getDevices().catch(() => []),
        notificationService.getNotificationHistory().catch(() => []),
      ]);

      if (remList && remList.length > 0) setReminders(remList);
      if (prefs) setPreferences(prefs);
      if (devList) setDevices(devList);
      if (logList) setLogs(logList);
    } catch (e) {
      console.warn('Backend fetch fallback to defaults:', e);
    }
  };

  const showBanner = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setBannerAlert({ message, type });
    setTimeout(() => setBannerAlert(null), 4000);
  };

  // Actions
  const handleUpdateReminder = async (id: string, updates: Partial<ReminderItem>) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    await notificationService.updateReminder(id, updates);
    showBanner('Reminder schedule updated.');
  };

  const handleAddReminder = async (newItem: Partial<ReminderItem>) => {
    const created = await notificationService.scheduleReminder(newItem);
    setReminders((prev) => [...prev, created]);
    showBanner('New reminder added to schedule.');
  };

  const handleDeleteReminder = async (id: string) => {
    await notificationService.cancelReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    showBanner('Reminder removed.');
  };

  const handleUpdatePreferences = async (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
    await notificationService.updatePreferences(updates);
    showBanner('Preferences synchronized with Supabase.');
  };

  // Alarm modal handlers
  const handleStartWorkout = (reminder: ReminderItem) => {
    setActiveAlarmReminder(null);
    setActiveWorkoutSession(reminder);
  };

  const handleSnooze = async (reminder: ReminderItem, minutes: number) => {
    setActiveAlarmReminder(null);
    await notificationService.snoozeReminder(reminder.id, minutes);
    await fetchData();
    showBanner(`Reminder snoozed for ${minutes} minutes.`, 'info');
  };

  const handleSkipToday = async (reminder: ReminderItem) => {
    setActiveAlarmReminder(null);
    await notificationService.skipToday(reminder.id);
    await fetchData();
    showBanner('Activity skipped for today.', 'warn');
  };

  const handleFinishWorkout = async (
    reminder: ReminderItem,
    record: CompletedWorkoutRecord,
    trackPoints: GPXTrackPoint[]
  ) => {
    setActiveWorkoutSession(null);
    await notificationService.completeWorkout(reminder.id);
    await fetchData();
    setCompletedWorkoutSummary({ record, trackPoints });
    showBanner(`Workout completed! Great job. (${Math.round(record.durationSeconds / 60)} mins logged)`, 'success');
  };

  const handleUpdateWorkConfig = async (newConfig: WorkScheduleConfig) => {
    setWorkConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fitbudget_work_config', JSON.stringify(newConfig));
    }
    if (currentUser) {
      const updated = await localAuthService.updateWorkSchedule(newConfig);
      setCurrentUser(updated);
    }
    showBanner('Weekly work & graduate school schedule updated.');
  };

  // Quick Test Alarm Trigger
  const triggerQuickTestAlarm = () => {
    const firstWorkout = reminders.find((r) => r.isAlarm) || reminders[0];
    setActiveAlarmReminder(firstWorkout);
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1F2421] flex flex-col antialiased selection:bg-[#234E3C] selection:text-white">
      <OfflineIndicator />

      {/* Top Banner Alert */}
      {bannerAlert && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold shadow-xl border animate-in slide-in-from-top duration-300 ${
            bannerAlert.type === 'success'
              ? 'bg-[#234E3C] text-white border-[#1C3F30]'
              : bannerAlert.type === 'warn'
              ? 'bg-[#C2633C] text-white border-[#9C4221]'
              : 'bg-[#1F2421] text-white border-black'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-300" />
          <span>{bannerAlert.message}</span>
        </div>
      )}

      {/* Main Header (Clean, Light, Warm Lifestyle Style) */}
      <header className="sticky top-0 z-40 border-b border-[#EAE7E0] bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Clean Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('today')}
              className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F0EC] text-[#234E3C] border border-[#CDE0D5]">
                <Bell className="w-4 h-4 fill-[#234E3C]" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-[#1F2421] group-hover:text-[#234E3C] transition">
                  FitBudget
                </h1>
                <p className="text-[11px] text-[#5C6460] hidden sm:block">
                  Daily Movement & Wellness Companion
                </p>
              </div>
            </button>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Quick Test Audio (desktop only, to keep mobile clean) */}
            <button
              onClick={triggerQuickTestAlarm}
              className="hidden md:flex items-center gap-1.5 rounded-xl border border-[#EAE7E0] bg-[#F8F7F4] px-3 py-1.5 text-xs font-medium text-[#5C6460] hover:text-[#1F2421] hover:bg-[#EAE7E0] transition"
              title="Test reminder chime"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#234E3C]" />
              <span>Test Chime</span>
            </button>

            {/* Profile Avatar / Login */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[#EAE7E0] bg-[#F8F7F4] px-2.5 py-1.5 text-xs font-medium text-[#1F2421] hover:bg-[#EAE7E0] transition cursor-pointer"
              title="Your Profile"
            >
              <div className="w-5 h-5 rounded-full bg-[#234E3C] text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser?.fullName.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline text-xs font-semibold">{currentUser?.fullName?.split(' ')[0] || 'Profile'}</span>
            </button>

            {/* Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#1F2421] hover:bg-[#2E3531] px-3.5 py-1.5 text-xs font-semibold text-white transition active:scale-95 cursor-pointer shadow-xs"
              title="Open Menu: Modify Schedule, Alarms, Sounds"
            >
              <Menu className="w-4 h-4 text-emerald-300" />
              <span>Menu</span>
            </button>
          </div>
        </div>

        {/* Clean Desktop Navigation Bar */}
        <div className="hidden md:block border-t border-stone-200/80 bg-white px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between py-2">
            <div className="flex items-center gap-1">
              {[
                { id: 'today', label: 'Today', icon: Play },
                { id: 'schedule', label: 'Schedule & Alarms', icon: Calendar },
                { id: 'recommendations', label: 'Sleep & Recovery', icon: Moon },
                { id: 'work_schedule', label: 'Work & Class Planner', icon: Briefcase },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-stone-100 text-stone-900 font-semibold'
                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-[#1B4332]' : 'text-stone-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-stone-400" />
              <span>Settings & Sync</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-12">
        {/* 1. HOMEPAGE: TODAY'S WORKOUT HUB (What workout to do now) */}
        {activeTab === 'today' && (
          <TodayWorkoutHub
            reminders={reminders}
            workConfig={workConfig}
            preferences={preferences}
            userName={currentUser?.fullName || preferences.userName || 'Athlete'}
            onStartWorkout={handleStartWorkout}
            onTriggerAlarm={(rem) => setActiveAlarmReminder(rem)}
            onSkipToday={handleSkipToday}
            onCompleteReminder={async (id) => {
              await notificationService.completeWorkout(id);
              await fetchData();
              showBanner('Routine marked as completed for today! 🎉');
            }}
            onOpenScheduleManager={() => setActiveTab('schedule')}
            onOpenWorkSchedule={() => setActiveTab('work_schedule')}
            onOpenMenu={() => setIsMenuOpen(true)}
            onOpenRecommendations={() => setActiveTab('recommendations')}
            onUpdateWorkConfig={handleUpdateWorkConfig}
            onUpdateReminders={(updated) => setReminders(updated)}
            onShowBanner={(msg, type) => showBanner(msg, type)}
          />
        )}

        {/* 2. DEDICATED HEALTH RECOMMENDATIONS & SLEEP ADAPTATION */}
        {activeTab === 'recommendations' && (
          <SleepRecoveryOptimizer
            workConfig={workConfig}
            onUpdateWorkConfig={handleUpdateWorkConfig}
            onApplyAdaptedSchedule={(newReminders) => {
              setReminders((prev) => [...prev, ...newReminders]);
              showBanner(`Synchronized ${newReminders.length} sleep-adapted alarms to your schedule!`);
            }}
          />
        )}

        {/* 3. SCHEDULE MANAGER: MODIFY REMINDERS & ALARMS */}
        {activeTab === 'schedule' && (
          <ScheduleManager
            reminders={reminders}
            preferences={preferences}
            workConfig={workConfig}
            onUpdateReminder={handleUpdateReminder}
            onAddReminder={handleAddReminder}
            onDeleteReminder={handleDeleteReminder}
            onTriggerAlarmModal={(rem) => setActiveAlarmReminder(rem)}
            onUpdatePreferences={handleUpdatePreferences}
            onScheduleUpdated={(updated, msg) => {
              setReminders(updated);
              showBanner(msg, 'success');
            }}
            onNavigateToPhoneDb={() => setActiveTab('phone_db')}
            onNavigateToWorkSchedule={() => setActiveTab('work_schedule')}
          />
        )}

        {/* 3. MON-SUN WORK & GRAD SCHOOL PLANNER */}
        {activeTab === 'work_schedule' && (
          <WorkSchedulePlanner
            workConfig={workConfig}
            onUpdateWorkConfig={handleUpdateWorkConfig}
            onApplyRecommendations={(newReminders) => {
              setReminders((prev) => [...prev, ...newReminders]);
              showBanner(`Added ${newReminders.length} tailored habit alarms to your schedule!`);
            }}
          />
        )}

        {activeTab === 'sounds' && (
          <SoundSettingsPanel
            sounds={preferences.sounds}
            onUpdateSounds={(updated) =>
              handleUpdatePreferences({
                sounds: { ...preferences.sounds, ...updated },
              })
            }
          />
        )}

        {activeTab === 'history' && (
          <NotificationCenter
            logs={logs}
            upcomingReminders={reminders.filter((r) => r.enabled)}
            onClearHistory={async () => {
              await notificationService.clearHistory();
              setLogs([]);
              showBanner('Notification center history cleared.');
            }}
            onMarkAllRead={async () => {
              await notificationService.markAllRead();
              setLogs((prev) => prev.map((l) => ({ ...l, read: true })));
            }}
            onTriggerAlarmModal={(rem) => setActiveAlarmReminder(rem)}
          />
        )}

        {activeTab === 'phone_db' && (
          <PhoneDatabaseManager
            preferences={preferences}
            reminders={reminders}
            onUpdatePreferences={handleUpdatePreferences}
            onRefreshData={fetchData}
            onOpenAppInstaller={() => setShowAppInstallerModal(true)}
          />
        )}

        {activeTab === 'devices' && (
          <DeviceSyncManager
            devices={devices}
            preferences={preferences}
            onRefreshDevices={fetchData}
            onUpdatePreferences={handleUpdatePreferences}
            onNavigateToPhoneDb={() => setActiveTab('phone_db')}
            onDeleteDevice={async (id) => {
              await fetch(`/api/devices/${id}`, { method: 'DELETE' });
              fetchData();
              showBanner('Device subscription removed.');
            }}
          />
        )}

        {activeTab === 'reliability' && <ReliabilityTestingSuite />}

        {activeTab === 'native' && <NativeAppArchitecture />}
      </main>

      {/* Active Workout Alarm Modal (High Priority) */}
      {activeAlarmReminder && (
        <WorkoutAlarmModal
          reminder={activeAlarmReminder}
          onStartWorkout={handleStartWorkout}
          onSnooze={handleSnooze}
          onSkipToday={handleSkipToday}
          onDismiss={() => setActiveAlarmReminder(null)}
          soundPreset={activeAlarmReminder.soundPreset || preferences.sounds.workout}
        />
      )}

      {/* Active Workout Session Tracker */}
      {activeWorkoutSession && (
        <ActiveWorkoutTracker
          reminder={activeWorkoutSession}
          allReminders={reminders}
          onFinishWorkout={handleFinishWorkout}
          onCancel={() => setActiveWorkoutSession(null)}
          onUpdateReminders={(updated) => setReminders(updated)}
          onShowBanner={(msg) => showBanner(msg, 'success')}
        />
      )}

      {/* Onboarding Permission Modal */}
      {showOnboarding && (
        <OnboardingPermissionModal
          preferences={preferences}
          onUpdatePreferences={handleUpdatePreferences}
          onComplete={() => {
            localStorage.setItem('fitbudget_onboarding_completed', 'true');
            setShowOnboarding(false);
            setPermissionStatus(notificationService.getPermissionStatus());
          }}
        />
      )}

      {/* App Installer & .apk / .exe Download Modal */}
      <AppInstallerModal
        isOpen={showAppInstallerModal}
        onClose={() => setShowAppInstallerModal(false)}
        onOpenPhoneDb={() => setActiveTab('phone_db')}
      />

      {/* Local DB Authentication Modal */}
      <LocalAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onUserChanged={(user) => {
          setCurrentUser(user);
          if (user.workSchedule) {
            setWorkConfig(user.workSchedule);
            localStorage.setItem('fitbudget_work_config', JSON.stringify(user.workSchedule));
          }
          setPreferences((prev) => ({ ...prev, userName: user.fullName }));
          showBanner(`Logged in as ${user.fullName} (Local Phone DB)`);
        }}
      />

      {/* Completed Workout Summary Modal with Next-Step Recommendations */}
      {completedWorkoutSummary && (
        <WorkoutSummaryModal
          workout={completedWorkoutSummary.record}
          trackPoints={completedWorkoutSummary.trackPoints}
          onClose={() => setCompletedWorkoutSummary(null)}
          onOpenSchedule={() => setActiveTab('schedule')}
        />
      )}

      {/* Mobile Bottom Navigation Bar (Clean & Native Feel) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-2 md:hidden">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'today'
                ? 'text-[#1B4332]'
                : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1">Today</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'schedule'
                ? 'text-[#1B4332]'
                : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1">Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'recommendations'
                ? 'text-[#1B4332]'
                : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            <Moon className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1">Sleep</span>
          </button>

          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1.5 rounded-xl text-stone-400 hover:text-stone-700 transition cursor-pointer"
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1">Settings</span>
          </button>
        </div>
      </nav>

      {/* Slide-Over Menu & Modifications Panel */}
      <AppMenuDrawer
        isOpen={isMenuOpen}
        activeTab={activeTab}
        currentUser={currentUser}
        storageMode={preferences.storageMode}
        permissionStatus={permissionStatus}
        unreadLogsCount={logs.filter((l) => !l.read).length}
        devicesCount={devices.length}
        onClose={() => setIsMenuOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab as any)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenAppInstaller={() => setShowAppInstallerModal(true)}
        onTriggerQuickAlarm={triggerQuickTestAlarm}
      />

      {/* Footer (Clean & Friendly) */}
      <footer className="border-t border-[#EAE7E0] bg-white py-6 text-center text-xs text-[#5C6460]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#5C6460]">
            <span className="font-bold text-[#1F2421]">FitBudget</span>
            <span>•</span>
            <span>Your Daily Movement & Routine Companion</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#5C6460]">
            <span>Timezone: <strong className="text-[#234E3C]">{preferences.timeZone}</strong></span>
            <span>•</span>
            <button
              onClick={() => setShowOnboarding(true)}
              className="hover:text-[#1F2421] underline underline-offset-2 cursor-pointer"
            >
              Alert Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
