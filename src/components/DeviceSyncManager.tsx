import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Tablet,
  Radio,
  Send,
  Trash2,
  Database,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Key,
  ExternalLink
} from 'lucide-react';
import { DeviceSubscription, UserPreferences } from '../types/notifications';
import { notificationService } from '../services/notificationService';

interface DeviceSyncManagerProps {
  devices: DeviceSubscription[];
  preferences: UserPreferences;
  onRefreshDevices: () => void;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onDeleteDevice: (id: string) => void;
  onNavigateToPhoneDb?: () => void;
}

export const DeviceSyncManager: React.FC<DeviceSyncManagerProps> = ({
  devices,
  preferences,
  onRefreshDevices,
  onUpdatePreferences,
  onDeleteDevice,
  onNavigateToPhoneDb,
}) => {
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testStatusMessage, setTestStatusMessage] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [schemaSql, setSchemaSql] = useState('');
  const [isSubscribingCurrent, setIsSubscribingCurrent] = useState(false);

  const currentPlatform = notificationService.getPlatform();
  const currentBrowser = notificationService.getBrowserName();
  const permissionStatus = notificationService.getPermissionStatus();

  const handleTestPush = async (device: DeviceSubscription) => {
    setTestingEndpoint(device.endpoint);
    setTestStatusMessage(null);
    try {
      const res = await notificationService.testPush({
        title: 'FitBudget Multi-Device Alert',
        body: `Test signal delivered to ${device.deviceName} (${device.platform.toUpperCase()})`,
        isAlarm: true,
        soundPreset: 'pulse-energy',
      });
      setTestStatusMessage(`Push notification dispatched to ${res.sentToDevices || 1} registered device(s).`);
    } catch (err: any) {
      setTestStatusMessage(`Push test error: ${err.message}`);
    } finally {
      setTestingEndpoint(null);
    }
  };

  const handleRegisterCurrentDevice = async () => {
    setIsSubscribingCurrent(true);
    try {
      await notificationService.requestPermission();
      await notificationService.registerDevice();
      onRefreshDevices();
    } catch (e: any) {
      alert(e.message || 'Error subscribing current device.');
    } finally {
      setIsSubscribingCurrent(false);
    }
  };

  const handleFetchSchema = async () => {
    try {
      const res = await fetch('/api/supabase/schema');
      const text = await res.text();
      setSchemaSql(text);
      setShowSchemaModal(true);
    } catch {
      alert('Unable to load Supabase schema.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const getPlatformIcon = (platform: DeviceSubscription['platform']) => {
    switch (platform) {
      case 'android':
      case 'ios':
        return <Smartphone className="w-5 h-5 text-emerald-400" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-cyan-400" />;
      case 'desktop':
      default:
        return <Laptop className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Database className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cross-Device Synchronization</h3>
              <p className="text-xs text-slate-400">
                All workout alarms, snooze timers, and custom sound configurations sync across your devices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToPhoneDb && (
              <button
                onClick={onNavigateToPhoneDb}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/40 transition"
              >
                <span>💾 Phone Local DB</span>
              </button>
            )}

            <button
              onClick={handleFetchSchema}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Supabase Schema</span>
            </button>

            <button
              onClick={onRefreshDevices}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Current Device Registration Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              {getPlatformIcon(currentPlatform)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">This Device:</span>
                <span className="font-mono text-xs text-emerald-300 font-bold uppercase">
                  {currentPlatform} • {currentBrowser}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Permission: <strong className="text-cyan-400 uppercase">{permissionStatus}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={handleRegisterCurrentDevice}
            disabled={isSubscribingCurrent}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isSubscribingCurrent ? 'Registering...' : 'Register Device for Push'}</span>
          </button>
        </div>
      </div>

      {testStatusMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{testStatusMessage}</span>
        </div>
      )}

      {/* Registered Devices List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Registered Devices ({devices.length})
          </h4>
          <span className="text-[11px] text-slate-500">
            Web Push endpoints tracked on server
          </span>
        </div>

        {devices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-slate-400">
            <Radio className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-white">No External Push Devices Registered Yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Tap &quot;Register Device for Push&quot; above or open FitBudget on your Android smartphone or iPhone to register multiple devices.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devices.map((device) => {
              const isTesting = testingEndpoint === device.endpoint;
              return (
                <div
                  key={device.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700">
                        {getPlatformIcon(device.platform)}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">{device.deviceName}</h5>
                        <p className="text-[11px] text-slate-400">{device.browser} • {device.platform}</p>
                      </div>
                    </div>

                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" title="Active" />
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    Endpoint: {device.endpoint.substring(0, 42)}...
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500">
                      Active: {new Date(device.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTestPush(device)}
                        disabled={isTesting}
                        className="flex items-center gap-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isTesting ? 'Sending...' : 'Test Ping'}</span>
                      </button>

                      <button
                        onClick={() => onDeleteDevice(device.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition"
                        title="Remove Device"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Supabase Schema Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Supabase SQL Table Schema</h3>
              </div>
              <button
                onClick={() => setShowSchemaModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Copy and execute this script inside your Supabase project SQL Editor to persist device subscriptions, user preferences, and notification history.
            </p>

            <pre className="mt-3 flex-1 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-[11px] text-emerald-300 border border-slate-800">
              {schemaSql}
            </pre>

            <div className="mt-4 flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                Includes RLS policies and table relations.
              </span>
              <button
                onClick={() => copyToClipboard(schemaSql)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
              >
                {copiedSchema ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSchema ? 'Copied to Clipboard' : 'Copy SQL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
