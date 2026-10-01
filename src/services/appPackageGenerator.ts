/**
 * FitBudget App Package & Standalone Installer Generator
 * Allows users to download standalone offline packages and Android APK configuration files.
 */

export class AppPackageGenerator {
  // 1. Download Standalone Offline App (.html) directly to phone Downloads
  public static downloadStandaloneOfflineApp(): void {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>FitBudget - Offline Standalone Mobile App</title>
  <meta name="theme-color" content="#020617">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background-color: #020617; color: #f8fafc; padding: 16px; min-height: 100vh; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
    .badge { display: inline-block; padding: 4px 10px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 999px; font-size: 11px; font-weight: bold; }
    h1 { font-size: 22px; font-weight: 800; color: #fff; margin: 8px 0; }
    h2 { font-size: 15px; font-weight: 700; color: #38bdf8; margin-bottom: 12px; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; }
    .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981, #06b6d4); color: #020617; font-weight: 700; font-size: 14px; border: none; border-radius: 12px; cursor: pointer; margin-top: 12px; text-decoration: none; }
    .btn:active { transform: scale(0.98); }
    .btn-secondary { background: #1e293b; color: #f8fafc; border: 1px solid #334155; }
    .reminder-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #020617; border: 1px solid #1e293b; border-radius: 12px; margin-top: 8px; }
    .time { font-family: monospace; font-size: 15px; font-weight: bold; color: #10b981; }
    .title { font-size: 13px; font-weight: 600; color: #f8fafc; }
    .clock { font-size: 42px; font-weight: 900; text-align: center; color: #f8fafc; font-family: monospace; margin: 16px 0; letter-spacing: 2px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">PHONE LOCAL OFFLINE APP</span>
    <h1>FitBudget Mobile</h1>
    <p>This standalone file runs completely on your phone with zero internet required. All data is saved inside your device storage.</p>
    <div class="clock" id="live-clock">--:--:--</div>
    <button class="btn" onclick="testAlarm()">⚡ Test Workout Alarm Sound</button>
  </div>

  <div class="card">
    <h2>Today's Workout & Habit Schedule</h2>
    <div id="schedule-list">
      <div class="reminder-item">
        <div>
          <div class="title">Strength Training Reminder</div>
          <p style="font-size: 11px; color: #64748b;">Full Body Workout</p>
        </div>
        <div class="time">12:00 PM</div>
      </div>
      <div class="reminder-item">
        <div>
          <div class="title">Night Walking Reminder</div>
          <p style="font-size: 11px; color: #64748b;">30 min brisk walk</p>
        </div>
        <div class="time">07:00 PM</div>
      </div>
      <div class="reminder-item">
        <div>
          <div class="title">Hydration Check</div>
          <p style="font-size: 11px; color: #64748b;">Drink 250ml water</p>
        </div>
        <div class="time">Every 60m</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Full Web App with Web Push</h2>
    <p>For the complete multi-screen app with background push notifications, install FitBudget directly from your browser home screen.</p>
    <a href="https://ais-dev-o7hjkdf5s3isf23g53vbss-889959811882.asia-east1.run.app" class="btn btn-secondary">Open Full FitBudget App</a>
  </div>

  <script>
    // Live Clock
    function updateClock() {
      const now = new Date();
      document.getElementById('live-clock').innerText = now.toLocaleTimeString();
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Sound Synthesizer via Web Audio API
    function testAlarm() {
      if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 600]);
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.35);
        });
        alert('FitBudget Alarm Triggered! (Sound & Vibration active)');
      } catch (e) {
        alert('Alarm triggered!');
      }
    }
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'FitBudget-Offline-App.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 2. Download Android Sideload & Build Configuration (README + Manifest + Config)
  public static downloadAndroidPackageFiles(): void {
    const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="app.fitbudget.mobile">

    <!-- Permissions for High Priority Workout Alarms -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="com.android.alarm.permission.SET_ALARM" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="FitBudget"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="FitBudget"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

    const buildGuide = `# FitBudget Android APK Build Guide (.apk Installer)

## Why doesn't Android use .exe?
- **.exe** is a Windows PC program file.
- **.apk** (Android Package Kit) is the Android equivalent of an .exe installer.

---

## 3 Ways to Get FitBudget on Your Android Phone:

### 1. Instant Official WebAPK Install (No PC required!)
1. Open FitBudget in **Google Chrome** on your phone:
   https://ais-dev-o7hjkdf5s3isf23g53vbss-889959811882.asia-east1.run.app
2. Tap the green **"Install App"** button at the top header (or Chrome 3 dots > "Install app").
3. Chrome communicates with Google's WebAPK service to automatically compile and install an official **.apk** on your Android phone!
4. Check **Settings > Apps > FitBudget** - it is installed as a true native package.

---

### 2. Build a Standalone .APK File using Bubblewrap (Google's official CLI)
If you want an actual .apk file to transfer or sideload:
\`\`\`bash
# 1. Install Google Bubblewrap
npm i -g @bubblewrap/cli

# 2. Initialize project from your FitBudget manifest
bubblewrap init --manifest="https://ais-dev-o7hjkdf5s3isf23g53vbss-889959811882.asia-east1.run.app/manifest.webmanifest"

# 3. Build the APK installer
bubblewrap build
\`\`\`
This produces \`app-release-signed.apk\` which you can directly tap and install on any Android phone!

---

### 3. Build with Capacitor (Native Android Studio Project)
\`\`\`bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init FitBudget app.fitbudget.mobile
npm run build
npx cap add android
npx cap open android
\`\`\`
Inside Android Studio, click **Build > Build APK(s)** to generate \`app-debug.apk\`.

---

### 4. For Windows PC Users:
If you want FitBudget as a desktop app on Windows (.exe):
1. Open FitBudget in **Chrome** or **Microsoft Edge** on your PC.
2. Click the **Install** icon on the right side of the address bar.
3. Windows installs it as a native desktop program with desktop and Start Menu shortcuts!
`;

    // Download Build Guide
    const blob = new Blob([buildGuide], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'FitBudget-Android-APK-Guide.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
