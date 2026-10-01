import { LocalUserProfile, AuthSession } from '../types/user';
import { WorkScheduleConfig } from '../types/workSchedule';
import { DEFAULT_WORK_CONFIG } from '../data/defaultWorkSchedule';

const USERS_STORAGE_KEY = 'fitbudget_local_users';
const CURRENT_USER_KEY = 'fitbudget_current_user_id';

class LocalAuthService {
  private currentUser: LocalUserProfile | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    if (typeof window === 'undefined') return;
    const currentId = localStorage.getItem(CURRENT_USER_KEY);
    const users = this.getAllUsers();
    if (currentId) {
      const found = users.find((u) => u.id === currentId);
      if (found) {
        this.currentUser = found;
        return;
      }
    }
    // If no user exists, create default local profile for immediate seamless use
    if (users.length === 0) {
      const defaultUser = this.createInitialUser('Ku', 'ku_fitness', '1234');
      this.currentUser = defaultUser;
      localStorage.setItem(CURRENT_USER_KEY, defaultUser.id);
    } else {
      this.currentUser = users[0];
      localStorage.setItem(CURRENT_USER_KEY, users[0].id);
    }
  }

  private getAllUsers(): LocalUserProfile[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveUsers(users: LocalUserProfile[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private createInitialUser(fullName: string, username: string, pin: string): LocalUserProfile {
    const newUser: LocalUserProfile = {
      id: `usr-${Date.now()}`,
      username: username.toLowerCase().trim(),
      fullName,
      pinOrPasswordHash: pin,
      avatarColor: 'from-emerald-500 to-cyan-500',
      fitnessGoal: 'office_health',
      workSchedule: { ...DEFAULT_WORK_CONFIG },
      stravaConnected: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    const users = this.getAllUsers();
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  public getCurrentUser(): LocalUserProfile | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public async signUp(params: {
    fullName: string;
    username: string;
    pinOrPassword: string;
    fitnessGoal?: LocalUserProfile['fitnessGoal'];
    workStartTime?: string;
    workEndTime?: string;
    hasSaturdayGradSchool?: boolean;
    saturdayStartTime?: string;
    saturdayEndTime?: string;
  }): Promise<LocalUserProfile> {
    const users = this.getAllUsers();
    const cleanUsername = params.username.toLowerCase().trim();

    const exists = users.find((u) => u.username === cleanUsername);
    if (exists) {
      throw new Error(`Username "${cleanUsername}" is already registered on this device.`);
    }

    const customWorkConfig: WorkScheduleConfig = {
      ...DEFAULT_WORK_CONFIG,
      defaultStartTime: params.workStartTime || '07:00',
      defaultEndTime: params.workEndTime || '18:00',
    };

    // Update weekday shifts with chosen work hours
    for (const day of [1, 2, 3, 4, 5]) {
      if (customWorkConfig.shifts[day]) {
        customWorkConfig.shifts[day].workStartTime = params.workStartTime || '07:00';
        customWorkConfig.shifts[day].workEndTime = params.workEndTime || '18:00';
      }
    }

    // Configure Saturday (default to Graduate School)
    if (params.hasSaturdayGradSchool !== false && customWorkConfig.shifts[6]) {
      customWorkConfig.shifts[6] = {
        ...customWorkConfig.shifts[6],
        isWorkDay: true,
        activityType: 'graduate_school',
        customTitle: 'Saturday Graduate School & Lectures',
        workStartTime: params.saturdayStartTime || '08:00',
        workEndTime: params.saturdayEndTime || '17:00',
        workType: 'classroom_lecture',
      };
    }

    const newUser: LocalUserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      fullName: params.fullName || cleanUsername,
      pinOrPasswordHash: params.pinOrPassword,
      avatarColor: 'from-emerald-500 to-cyan-500',
      fitnessGoal: params.fitnessGoal || 'office_health',
      workSchedule: customWorkConfig,
      stravaConnected: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);

    this.currentUser = newUser;
    localStorage.setItem(CURRENT_USER_KEY, newUser.id);

    return newUser;
  }

  public async logIn(username: string, pinOrPassword: string): Promise<LocalUserProfile> {
    const users = this.getAllUsers();
    const cleanUsername = username.toLowerCase().trim();
    const user = users.find((u) => u.username === cleanUsername);

    if (!user) {
      throw new Error('User not found on this phone database. Please sign up.');
    }

    if (user.pinOrPasswordHash !== pinOrPassword) {
      throw new Error('Incorrect password or PIN.');
    }

    user.lastLoginAt = new Date().toISOString();
    this.saveUsers(users);

    this.currentUser = user;
    localStorage.setItem(CURRENT_USER_KEY, user.id);

    return user;
  }

  public logOut(): void {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  public switchUser(userId: string): LocalUserProfile | null {
    const users = this.getAllUsers();
    const found = users.find((u) => u.id === userId);
    if (found) {
      this.currentUser = found;
      localStorage.setItem(CURRENT_USER_KEY, found.id);
      return found;
    }
    return null;
  }

  public async updateWorkSchedule(newConfig: WorkScheduleConfig): Promise<LocalUserProfile> {
    if (!this.currentUser) throw new Error('Not logged in');
    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.id === this.currentUser?.id);
    if (idx >= 0) {
      users[idx].workSchedule = newConfig;
      this.saveUsers(users);
      this.currentUser = users[idx];
    }
    return this.currentUser;
  }

  public async updateUserProfile(updates: Partial<LocalUserProfile>): Promise<LocalUserProfile> {
    if (!this.currentUser) throw new Error('Not logged in');
    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.id === this.currentUser?.id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...updates };
      this.saveUsers(users);
      this.currentUser = users[idx];
    }
    return this.currentUser;
  }

  public async setStravaConnection(connected: boolean, athleteId?: string, accessToken?: string): Promise<LocalUserProfile> {
    return this.updateUserProfile({
      stravaConnected: connected,
      stravaAthleteId: athleteId,
      stravaAccessToken: accessToken,
    });
  }

  public getUsersList(): LocalUserProfile[] {
    return this.getAllUsers();
  }
}

export const localAuthService = new LocalAuthService();
