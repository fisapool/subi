import { db } from './firebaseConfig';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

class FirebaseSessionManager {
  constructor(userId) {
    this.userId = userId;
    this.deviceId = this.generateDeviceId();
    this.heartbeatInterval = window.setInterval(() => this.updateHeartbeat(), 30000);
    this.reconnectTimeout = null;
    this.setupConnectionMonitoring();
  }

  generateDeviceId() {
    const stored = sessionStorage.getItem('deviceId');
    if (stored) return stored;

    const newId = crypto.randomUUID();
    sessionStorage.setItem('deviceId', newId);
    return newId;
  }

  async updateHeartbeat() {
    try {
      const sessionRef = doc(db, `users/${this.userId}/sessions/${this.deviceId}`);
      await setDoc(sessionRef, {
        lastActive: new Date(),
        isConnected: true,
        deviceId: this.deviceId,
      }, { merge: true });
    } catch (error) {
      console.error('Failed to update heartbeat:', error);
    }
  }

  setupConnectionMonitoring() {
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));
  }

  async handleConnectionChange(isOnline) {
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

  cleanup() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
  }
}

export default FirebaseSessionManager;
