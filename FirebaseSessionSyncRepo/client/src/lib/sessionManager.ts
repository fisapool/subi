
import { db } from './firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

interface SessionState {
  lastActive: Date;
  isConnected: boolean;
  deviceId: string;
}

export class SessionManager {
  private userId: string;
  private deviceId: string;
  private heartbeatInterval: number;
  private reconnectTimeout: number | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.deviceId = this.generateDeviceId();
    this.heartbeatInterval = setInterval(() => this.updateHeartbeat(), 30000);
    this.setupConnectionMonitoring();
  }

  private generateDeviceId(): string {
    const stored = sessionStorage.getItem('deviceId');
    if (stored) return stored;
    
    const newId = crypto.randomUUID();
    sessionStorage.setItem('deviceId', newId);
    return newId;
  }

  private async updateHeartbeat() {
    try {
      const sessionRef = doc(db, `users/${this.userId}/sessions/${this.deviceId}`);
      await setDoc(sessionRef, {
        lastActive: new Date(),
        isConnected: true,
        deviceId: this.deviceId
      } as SessionState, { merge: true });
    } catch (error) {
      console.error("Failed to update heartbeat:", error);
    }
  }

  private setupConnectionMonitoring() {
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));
  }

  private async handleConnectionChange(isOnline: boolean) {
    if (!isOnline) {
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      
      const sessionRef = doc(db, `users/${this.userId}/sessions/${this.deviceId}`);
      await updateDoc(sessionRef, { isConnected: false });
    } else {
      this.reconnectTimeout = window.setTimeout(async () => {
        await this.updateHeartbeat();
      }, 2000);
    }
  }

  public cleanup() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
  }
}
