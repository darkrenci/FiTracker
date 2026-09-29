import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  AlertTriangle,
  Trash2,
  CheckCheck,
  Filter,
  Calendar,
  Sparkles
} from 'lucide-react';
import { NotificationLog, ReminderItem } from '../types/notifications';

interface NotificationCenterProps {
  logs: NotificationLog[];
  upcomingReminders: ReminderItem[];
  onClearHistory: () => void;
  onMarkAllRead: () => void;
  onTriggerAlarmModal: (reminder: ReminderItem) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  logs,
  upcomingReminders,
  onClearHistory,
  onMarkAllRead,
  onTriggerAlarmModal,
}) => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'delivered' | 'snoozed' | 'completed' | 'dismissed' | 'failed'>('all');

  const unreadCount = logs.filter((l) => !l.read).length;

  const filteredLogs = logs.filter((l) => {
    if (filter === 'all') return true;
    if (filter === 'delivered') return l.status === 'delivered';
    if (filter === 'snoozed') return l.status === 'snoozed';
    if (filter === 'completed') return l.status === 'completed';
    if (filter === 'dismissed') return l.status === 'dismissed' || l.status === 'skipped';
    if (filter === 'failed') return l.status === 'failed';
    return true;
  });

  const getStatusBadge = (status: NotificationLog['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>Completed</span>
          </span>
        );
      case 'snoozed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 text-cyan-300 px-2 py-0.5 text-[10px] font-bold">
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>Snoozed</span>
          </span>
        );
      case 'dismissed':
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 text-rose-300 px-2 py-0.5 text-[10px] font-bold">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>{status === 'skipped' ? 'Skipped' : 'Dismissed'}</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Delivery Failed</span>
          </span>
        );
      case 'delivered':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 text-blue-300 px-2 py-0.5 text-[10px] font-bold">
            <Bell className="w-3 h-3 text-blue-400" />
            <span>Delivered</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Notification Center</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit log of delivered pushes, background dispatches, snoozes, and completed activities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All History' },
          { id: 'upcoming', label: `Upcoming (${upcomingReminders.length})` },
          { id: 'delivered', label: 'Delivered' },
          { id: 'snoozed', label: 'Snoozed' },
          { id: 'completed', label: 'Completed' },
          { id: 'dismissed', label: 'Dismissed' },
          { id: 'failed', label: 'Failed Attempts' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id as any)}
            className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === btn.id
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-sm'
                : 'border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Section: Upcoming Reminders */}
      {(filter === 'all' || filter === 'upcoming') && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upcoming Scheduled Reminders</span>
            </h4>
            <span className="text-[11px] text-slate-500">Auto-synced with Supabase</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {upcomingReminders.slice(0, 4).map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">{reminder.time}</span>
                    <span className="text-xs font-bold text-white truncate">{reminder.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{reminder.message}</p>
                </div>

                <button
                  onClick={() => onTriggerAlarmModal(reminder)}
                  className="flex-shrink-0 text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
                >
                  Test
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Notification Logs List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Delivery Log & Historical Events ({filteredLogs.length})
        </h4>

        {filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            <Bell className="w-8 h-8 mx-auto text-slate-700 mb-2" />
            <p className="text-xs">No notification records matching this category.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition ${
                !log.read ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800/80 bg-slate-900/60'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5">
                  {!log.read ? (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  ) : (
                    <span className="flex h-2 w-2 rounded-full bg-slate-700" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-white">{log.title}</span>
                    {getStatusBadge(log.status)}
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {log.category}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-300">{log.message}</p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                    {log.device && <span>• Target: {log.device}</span>}
                    {log.actionTaken && <span>• Action: {log.actionTaken}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
