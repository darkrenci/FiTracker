import React from 'react';
import {
  X,
  Play,
  Calendar,
  Volume2,
  HardDrive,
  Database,
  Bell,
  ShieldAlert,
  Layers,
  ChevronRight,
  Download,
  CheckCircle2,
  Sliders,
  Radio,
  GraduationCap,
  Sparkles,
  Leaf
} from 'lucide-react';
import { LocalUserProfile } from '../types/user';

interface AppMenuDrawerProps {
  isOpen: boolean;
  activeTab: string;
  currentUser: LocalUserProfile | null;
  storageMode: string;
  permissionStatus: NotificationPermission | string;
  unreadLogsCount: number;
  devicesCount: number;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  onOpenAuthModal: () => void;
  onOpenAppInstaller: () => void;
  onTriggerQuickAlarm: () => void;
}

export const AppMenuDrawer: React.FC<AppMenuDrawerProps> = ({
  isOpen,
  activeTab,
  currentUser,
  storageMode,
  permissionStatus,
  unreadLogsCount,
  devicesCount,
  onClose,
  onSelectTab,
  onOpenAuthModal,
  onOpenAppInstaller,
  onTriggerQuickAlarm,
}) => {
  if (!isOpen) return null;

  const handleNav = (tabId: string) => {
    onSelectTab(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm sm:max-w-md h-full bg-white border-l border-[#EAE7E0] flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAE7E0] flex items-center justify-between bg-[#F8F7F4]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F0EC] text-[#234E3C] border border-[#CDE0D5] font-bold">
              <Leaf className="w-4 h-4 text-[#234E3C]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F2421]">Menu & Settings</h3>
              <p className="text-[11px] text-[#5C6460]">Manage schedules, sleep habits & alarms</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white border border-[#EAE7E0] text-[#5C6460] hover:text-[#1F2421] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* User Profile Card */}
          <div className="p-3.5 rounded-2xl bg-[#F8F7F4] border border-[#EAE7E0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#234E3C] text-white flex items-center justify-center font-bold text-sm">
                {currentUser?.fullName.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1F2421]">
                  {currentUser?.fullName || 'Local User'}
                </h4>
                <div className="flex items-center gap-1 text-[10px] text-[#234E3C] font-medium">
                  <CheckCircle2 className="w-3 h-3 text-[#234E3C]" />
                  <span>Personal Routine Profile</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenAuthModal();
              }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-white hover:bg-[#EAE7E0] text-[#1F2421] border border-[#EAE7E0] transition cursor-pointer"
            >
              Switch
            </button>
          </div>

          {/* Quick Action Button: Test Alarm */}
          <button
            onClick={() => {
              onClose();
              onTriggerQuickAlarm();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#E8F0EC] border border-[#CDE0D5] hover:bg-[#D7E6DD] text-[#234E3C] transition text-xs font-semibold cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 fill-[#234E3C]" />
              <span>Test Reminder Chime</span>
            </div>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-medium border border-[#CDE0D5]">Play</span>
          </button>

          {/* Group 1: Core Schedules & Alarms */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6460] block px-1">
              🌿 Daily Routines
            </span>

            <button
              onClick={() => handleNav('today')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-[#E8F0EC] border-[#234E3C]/40 text-[#234E3C] font-bold shadow-xs'
                  : 'bg-[#F8F7F4] border-[#EAE7E0] text-[#1F2421] hover:bg-[#EAE7E0]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">🌿</span>
                <div>
                  <div className="text-xs font-bold">Today's Routine Hub</div>
                  <div className="text-[11px] text-[#5C6460]">What workout to do right now</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8F9792]" />
            </button>

            <button
              onClick={() => handleNav('recommendations')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'recommendations'
                  ? 'bg-[#E8F0EC] border-[#234E3C]/40 text-[#234E3C] font-bold shadow-xs'
                  : 'bg-[#F8F7F4] border-[#EAE7E0] text-[#1F2421] hover:bg-[#EAE7E0]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">💡</span>
                <div>
                  <div className="text-xs font-bold">Sleep & Health Guidance</div>
                  <div className="text-[11px] text-[#5C6460]">12 AM / 1 AM late bedtime recovery</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8F9792]" />
            </button>

            <button
              onClick={() => handleNav('schedule')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-[#E8F0EC] border-[#234E3C]/40 text-[#234E3C] font-bold shadow-xs'
                  : 'bg-[#F8F7F4] border-[#EAE7E0] text-[#1F2421] hover:bg-[#EAE7E0]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#234E3C]" />
                <div>
                  <div className="text-xs font-bold">Schedule & Alarms</div>
                  <div className="text-[11px] text-[#5C6460]">Edit times, days & alert preferences</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8F9792]" />
            </button>

            <button
              onClick={() => handleNav('work_schedule')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'work_schedule'
                  ? 'bg-[#E8F0EC] border-[#234E3C]/40 text-[#234E3C] font-bold shadow-xs'
                  : 'bg-[#F8F7F4] border-[#EAE7E0] text-[#1F2421] hover:bg-[#EAE7E0]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-4 h-4 text-[#C2633C]" />
                <div>
                  <div className="text-xs font-bold">Work & Study Routine Planner</div>
                  <div className="text-[11px] text-[#5C6460]">Mon–Fri office hours & Saturday classes</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8F9792]" />
            </button>

            <button
              onClick={() => handleNav('sounds')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'sounds'
                  ? 'bg-[#E8F0EC] border-[#234E3C]/40 text-[#234E3C] font-bold shadow-xs'
                  : 'bg-[#F8F7F4] border-[#EAE7E0] text-[#1F2421] hover:bg-[#EAE7E0]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-[#234E3C]" />
                <div>
                  <div className="text-xs font-bold">Chimes & Sounds</div>
                  <div className="text-[11px] text-[#5C6460]">Preview 7 gentle reminder audio tones</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8F9792]" />
            </button>
          </div>

          {/* Group 2: Phone Database & Downloads */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6460] block px-1">
              💾 Storage & App Installation
            </span>

            <button
              onClick={() => handleNav('phone_db')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'phone_db'
                  ? 'bg-[#E8F0EC] border-[#234E3C]/40 text-[#234E3C] font-bold shadow-xs'
                  : 'bg-[#F8F7F4] border-[#EAE7E0] text-[#1F2421] hover:bg-[#EAE7E0]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-[#234E3C]" />
                <div>
                  <div className="text-xs font-bold">My Profile & Saved Data</div>
                  <div className="text-[11px] text-[#5C6460]">Local device storage & offline backup</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8F9792]" />
            </button>

            <button
              onClick={() => handleNav('devices')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'devices'
                  ? 'bg-[#E8F0EC] border-[#234E3C]/40 text-[#234E3C] font-bold shadow-xs'
                  : 'bg-[#F8F7F4] border-[#EAE7E0] text-[#1F2421] hover:bg-[#EAE7E0]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-[#234E3C]" />
                <div>
                  <div className="text-xs font-bold">Multi-Device Sync</div>
                  <div className="text-[11px] text-[#5C6460]">{devicesCount} device(s) connected</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8F9792]" />
            </button>
          </div>

          {/* Group 3: Diagnostics */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6460] block px-1">
              🧪 Tests & History
            </span>

            <button
              onClick={() => handleNav('history')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#E8F0EC] border-[#234E3C]/40 text-[#234E3C] font-bold shadow-xs'
                  : 'bg-[#F8F7F4] border-[#EAE7E0] text-[#1F2421] hover:bg-[#EAE7E0]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#C2633C]" />
                <div>
                  <div className="text-xs font-bold">Alert History & Logs</div>
                  <div className="text-[11px] text-[#5C6460]">{unreadLogsCount} recent records</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8F9792]" />
            </button>

            <button
              onClick={() => handleNav('reliability')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'reliability'
                  ? 'bg-[#E8F0EC] border-[#234E3C]/40 text-[#234E3C] font-bold shadow-xs'
                  : 'bg-[#F8F7F4] border-[#EAE7E0] text-[#1F2421] hover:bg-[#EAE7E0]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#234E3C]" />
                <div>
                  <div className="text-xs font-bold">System Reliability Suite</div>
                  <div className="text-[11px] text-[#5C6460]">Verify background alarms and sounds</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8F9792]" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#EAE7E0] bg-[#F8F7F4] flex items-center justify-between text-xs text-[#5C6460]">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#234E3C]" />
            <span className="capitalize">Alerts: {permissionStatus}</span>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenAppInstaller();
            }}
            className="flex items-center gap-1 text-[#234E3C] font-bold hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App on Phone</span>
          </button>
        </div>
      </div>
    </div>
  );
};
