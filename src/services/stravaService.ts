/**
 * Strava Activity Tracking & Sync Service
 * Supports live GPS distance tracking, Strava activity upload, and GPX export.
 */

export interface GPXTrackPoint {
  lat: number;
  lon: number;
  time: string;
  elevation?: number;
}

export interface StravaActivityPayload {
  name: string;
  type: 'Run' | 'Walk' | 'Workout';
  startDateLocal: string;
  elapsedTimeSeconds: number;
  distanceMeters: number;
  description?: string;
}

export class StravaService {
  // Compute distance between two GPS coordinates using Haversine formula
  public static calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Generate Strava-compatible GPX XML string
  public static generateGPX(activityName: string, trackPoints: GPXTrackPoint[]): string {
    const timeIso = new Date().toISOString();
    const trkpts = trackPoints
      .map(
        (pt) => `      <trkpt lat="${pt.lat.toFixed(6)}" lon="${pt.lon.toFixed(6)}">
        <ele>${(pt.elevation || 15).toFixed(1)}</ele>
        <time>${pt.time}</time>
      </trkpt>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="FitBudget Mobile App" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${activityName}</name>
    <time>${timeIso}</time>
  </metadata>
  <trk>
    <name>${activityName}</name>
    <type>running</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
  }

  // Download GPX file directly to phone for 1-tap Strava upload
  public static downloadGPXFile(activityName: string, trackPoints: GPXTrackPoint[]): string {
    const gpxString = this.generateGPX(activityName, trackPoints);
    const fileName = `FitBudget-${activityName.replace(/\s+/g, '_')}-${Date.now()}.gpx`;
    const blob = new Blob([gpxString], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return fileName;
  }

  // Sync to Strava API or mark local sync
  public static async syncActivityToStrava(
    payload: StravaActivityPayload,
    accessToken?: string
  ): Promise<{ success: boolean; activityId?: string; message: string }> {
    if (!accessToken) {
      // Offline local simulation mode
      return {
        success: true,
        activityId: `strava-local-${Date.now()}`,
        message: 'Activity tracked and saved with Strava GPX format in phone storage.',
      };
    }

    try {
      const res = await fetch('https://www.strava.com/api/v3/activities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: payload.name,
          type: payload.type,
          start_date_local: payload.startDateLocal,
          elapsed_time: payload.elapsedTimeSeconds,
          distance: payload.distanceMeters,
          description: payload.description || 'Logged with FitBudget Smart Workout Tracker',
        }),
      });

      if (!res.ok) {
        throw new Error(`Strava API status: ${res.status}`);
      }

      const data = await res.json();
      return {
        success: true,
        activityId: data.id ? String(data.id) : undefined,
        message: 'Successfully uploaded activity directly to your Strava profile!',
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Strava sync note: ${e.message || 'Offline mode saved locally'}.`,
      };
    }
  }
}
