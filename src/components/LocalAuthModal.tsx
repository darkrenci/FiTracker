import React, { useState } from 'react';
import {
  User,
  Lock,
  UserPlus,
  LogIn,
  X,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Clock,
  Sparkles,
  ShieldCheck,
  Users
} from 'lucide-react';
import { localAuthService } from '../services/localAuth';
import { LocalUserProfile } from '../types/user';

interface LocalAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChanged: (user: LocalUserProfile) => void;
}

export const LocalAuthModal: React.FC<LocalAuthModalProps> = ({
  isOpen,
  onClose,
  onUserChanged,
}) => {
  const [view, setView] = useState<'login' | 'signup' | 'switch'>('login');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [workStartTime, setWorkStartTime] = useState('07:00');
  const [workEndTime, setWorkEndTime] = useState('18:00');
  const [hasSaturdayGradSchool, setHasSaturdayGradSchool] = useState(true);
  const [saturdayStartTime, setSaturdayStartTime] = useState('08:00');
  const [saturdayEndTime, setSaturdayEndTime] = useState('17:00');
  const [fitnessGoal, setFitnessGoal] = useState<LocalUserProfile['fitnessGoal']>('office_health');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUser = localAuthService.getCurrentUser();
  const allUsers = localAuthService.getUsersList();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await localAuthService.logIn(username, password);
      setSuccess(`Welcome back, ${user.fullName}!`);
      setTimeout(() => {
        onUserChanged(user);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Username and password/PIN are required.');
      return;
    }
    try {
      const user = await localAuthService.signUp({
        fullName: fullName || username,
        username,
        pinOrPassword: password,
        fitnessGoal,
        workStartTime,
        workEndTime,
        hasSaturdayGradSchool,
        saturdayStartTime,
        saturdayEndTime,
      });
      setSuccess(`Account created locally for ${user.fullName}!`);
      setTimeout(() => {
        onUserChanged(user);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    }
  };

  const handleSwitchUser = (userId: string) => {
    const user = localAuthService.switchUser(userId);
    if (user) {
      setSuccess(`Switched to profile: ${user.fullName}`);
      setTimeout(() => {
        onUserChanged(user);
        onClose();
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Local Phone Account</h3>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  100% Offline DB
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Credentials & schedules stored strictly on this device
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex rounded-2xl bg-slate-950 p-1.5 border border-slate-800 my-4 text-xs font-bold gap-1">
          <button
            onClick={() => {
              setView('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-xl transition ${
              view === 'login' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => {
              setView('signup');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-xl transition ${
              view === 'signup' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => {
              setView('switch');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-xl transition ${
              view === 'switch' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Profiles ({allUsers.length})
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Login Form */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. ku_fitness"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password or 4-Digit PIN</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="Enter PIN / password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In to Local Phone Database</span>
            </button>

            {currentUser && (
              <div className="pt-2 text-center text-[11px] text-slate-500">
                Logged in as: <strong className="text-emerald-400">{currentUser.fullName}</strong> (@{currentUser.username})
              </div>
            )}
          </form>
        )}

        {/* Sign Up Form */}
        {view === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ku Santos"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Username (saved on phone)</label>
              <input
                type="text"
                required
                placeholder="e.g. ku_fitness"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Create Password / PIN</label>
              <input
                type="password"
                required
                placeholder="Enter a password or PIN"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Work Schedule Setup (e.g. 7am - 6pm) */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Weekday Work Shift Hours (Mon – Fri)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                FitBudget uses these hours to recommend office exercises and workouts:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Shift Starts:</span>
                  <input
                    type="time"
                    value={workStartTime}
                    onChange={(e) => setWorkStartTime(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Shift Ends:</span>
                  <input
                    type="time"
                    value={workEndTime}
                    onChange={(e) => setWorkEndTime(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Saturday Graduate School Option */}
            <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                  <span>🎓</span>
                  <span>Saturday Graduate School</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSaturdayGradSchool}
                    onChange={(e) => setHasSaturdayGradSchool(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                  <span className="font-semibold text-[11px] text-purple-200">Attend Grad School</span>
                </label>
              </div>

              {hasSaturdayGradSchool ? (
                <>
                  <p className="text-[11px] text-slate-400">
                    Auto-schedules cognitive clarity walks, lecture breaks & post-class run:
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Classes Start:</span>
                      <input
                        type="time"
                        value={saturdayStartTime}
                        onChange={(e) => setSaturdayStartTime(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Classes End:</span>
                      <input
                        type="time"
                        value={saturdayEndTime}
                        onChange={(e) => setSaturdayEndTime(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Saturday will be set as an active recovery / rest day.
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Primary Fitness Goal</label>
              <select
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value as any)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="office_health">🏢 Office Desk Health & Anti-Slouch</option>
                <option value="fat_loss">🔥 Fat Loss & Calorie Burn</option>
                <option value="endurance">🏃 Running & Walking Endurance</option>
                <option value="muscle_gain">💪 Strength & Muscle Tone</option>
                <option value="general_wellness">✨ General Energy & Sleep</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Local Phone Profile</span>
            </button>
          </form>
        )}

        {/* Switch Profile View */}
        {view === 'switch' && (
          <div className="space-y-2 text-xs">
            <p className="text-[11px] text-slate-400 mb-2">
              Profiles stored in this phone's IndexedDB:
            </p>
            {allUsers.map((u) => {
              const isCurrent = currentUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                    isCurrent ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-xs">
                      {u.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-white text-xs">{u.fullName}</strong>
                        {isCurrent && <span className="text-[10px] text-emerald-400 font-bold">Active</span>}
                      </div>
                      <span className="text-[10px] text-slate-500">@{u.username} • {u.workSchedule.defaultStartTime}–{u.workSchedule.defaultEndTime}</span>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleSwitchUser(u.id)}
                      className="rounded-xl bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition"
                    >
                      Switch
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
