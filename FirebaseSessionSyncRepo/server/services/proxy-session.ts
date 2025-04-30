
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import type { User } from '@shared/schema';

export class ProxySessionService {
  static async startSession(user: User, proxyId: string) {
    const sessionRef = await addDoc(collection(db, 'proxySessions'), {
      userId: user.uid,
      proxyId,
      startTime: new Date(),
      endTime: null,
      bandwidthUsed: 0,
      averageLatency: null
    });
    
    return sessionRef.id;
  }

  static async updateSessionMetrics(sessionId: string, bandwidthUsed: number, latency: number) {
    const sessionRef = doc(db, 'proxySessions', sessionId);
    await updateDoc(sessionRef, {
      bandwidthUsed,
      averageLatency: latency
    });
  }

  static async endSession(sessionId: string) {
    const sessionRef = doc(db, 'proxySessions', sessionId);
    await updateDoc(sessionRef, {
      endTime: new Date()
    });
  }
}
