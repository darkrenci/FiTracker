import { WorkScheduleConfig } from './workSchedule';

export interface LocalUserProfile {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  pinOrPasswordHash: string;
  avatarColor: string;
  fitnessGoal: 'fat_loss' | 'muscle_gain' | 'endurance' | 'office_health' | 'general_wellness';
  workSchedule: WorkScheduleConfig;
  stravaConnected: boolean;
  stravaAthleteId?: string;
  stravaAccessToken?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthSession {
  user: LocalUserProfile | null;
  isAuthenticated: boolean;
}
