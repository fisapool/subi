
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export class MonitoringService {
  private static bytesToMB(bytes: number): number {
    return Math.round(bytes / (1024 * 1024));
  }

  private static calculateSpeed(bytesTransferred: number, timeInSeconds: number): number {
    return bytesTransferred / timeInSeconds / 1024; // KB/s
  }

  static async updateSessionMetrics(sessionId: string, bandwidthUsed: number, latency: number, startTime: number) {
    try {
      const sessionRef = doc(db, 'proxySessions', sessionId);
      const elapsedTime = (Date.now() - startTime) / 1000;
      const speed = this.calculateSpeed(bandwidthUsed, elapsedTime);
      
      await updateDoc(sessionRef, {
        bandwidthUsed: this.bytesToMB(bandwidthUsed),
        averageLatency: Math.round(latency),
        transferSpeed: Math.round(speed),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating session metrics:', error);
    }
  }

  static async getSessionMetrics(userId: string) {
    try {
      const sessionsRef = collection(db, 'proxySessions');
      const q = query(
        sessionsRef,
        where('userId', '==', userId),
        orderBy('startTime', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching session metrics:', error);
      return [];
    }
  }
}
