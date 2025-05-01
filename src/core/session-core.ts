import { Session, SessionGroup } from '../types/types';
import { ValidationService } from '../services/validation-service';

export class SessionCore {
  private sessions: Map<string, Session> = new Map();
  private groups: Map<string, SessionGroup> = new Map();
  private validationService: ValidationService;
  private sessionLock: Map<string, boolean> = new Map();

  constructor() {
    this.validationService = new ValidationService();
    this.initialize();
  }

  private async initialize() {
    try {
      // Load existing sessions and groups from storage
      const storedSessions = await chrome.storage.local.get('sessions');
      const storedGroups = await chrome.storage.local.get('groups');
      
      if (storedSessions.sessions) {
        // Validate and filter out corrupted sessions
        const validSessions = Object.entries(storedSessions.sessions)
          .filter(([_, session]) => {
            const validation = this.validationService.validateSession(session as Session);
            return validation.isValid;
          });
        this.sessions = new Map(validSessions);
      }
      
      if (storedGroups.groups) {
        // Validate and filter out corrupted groups
        const validGroups = Object.entries(storedGroups.groups)
          .filter(([_, group]) => {
            const validation = this.validationService.validateSessionGroup(group as SessionGroup);
            return validation.isValid;
          });
        this.groups = new Map(validGroups);
      }
    } catch (error) {
      console.error('Error initializing session core:', error);
      // Initialize with empty maps if there's an error
      this.sessions = new Map();
      this.groups = new Map();
    }
  }

  private async acquireLock(sessionId: string): Promise<boolean> {
    if (this.sessionLock.get(sessionId)) {
      return false;
    }
    this.sessionLock.set(sessionId, true);
    return true;
  }

  private releaseLock(sessionId: string): void {
    this.sessionLock.delete(sessionId);
  }

  public async saveSession(session: Session): Promise<{ success: boolean; error?: string }> {
    // Validate session data
    const validation = this.validationService.validateSession(session);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Check for session ID collision
    if (this.sessions.has(session.id)) {
      return { success: false, error: 'Session ID already exists' };
    }

    // Acquire lock for the session
    const lockAcquired = await this.acquireLock(session.id);
    if (!lockAcquired) {
      return { success: false, error: 'Session is currently being modified' };
    }

    try {
      this.sessions.set(session.id, session);
      await chrome.storage.local.set({
        sessions: Object.fromEntries(this.sessions)
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      this.releaseLock(session.id);
    }
  }

  public async saveGroup(group: SessionGroup): Promise<{ success: boolean; error?: string }> {
    // Validate group data
    const validation = this.validationService.validateSessionGroup(group);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    try {
      this.groups.set(group.id, group);
      await chrome.storage.local.set({
        groups: Object.fromEntries(this.groups)
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public getSession(id: string): { session?: Session; error?: string } {
    const session = this.sessions.get(id);
    if (!session) {
      return { error: 'Session not found' };
    }

    // Check if session is expired
    const isExpired = this.validationService.isSessionExpired(session, 30 * 24 * 60 * 60 * 1000); // 30 days
    if (isExpired) {
      return { error: 'Session has expired' };
    }

    return { session };
  }

  public getGroup(id: string): { group?: SessionGroup; error?: string } {
    const group = this.groups.get(id);
    if (!group) {
      return { error: 'Group not found' };
    }
    return { group };
  }

  public getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  public getAllGroups(): SessionGroup[] {
    return Array.from(this.groups.values());
  }

  public async deleteSession(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.sessions.has(id)) {
      return { success: false, error: 'Session not found' };
    }

    const lockAcquired = await this.acquireLock(id);
    if (!lockAcquired) {
      return { success: false, error: 'Session is currently being modified' };
    }

    try {
      this.sessions.delete(id);
      await chrome.storage.local.set({
        sessions: Object.fromEntries(this.sessions)
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      this.releaseLock(id);
    }
  }

  public async deleteGroup(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.groups.has(id)) {
      return { success: false, error: 'Group not found' };
    }

    try {
      this.groups.delete(id);
      await chrome.storage.local.set({
        groups: Object.fromEntries(this.groups)
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
} 