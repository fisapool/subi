import { db } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import type { ProxyServer, ProxySession } from "@shared/schema";

// Collection references
const proxyServersCollection = "proxyServers";
const proxySessionsCollection = "proxySessions";

// Proxy Server Operations
export function subscribeToProxyServers(userId: string, callback: (proxies: ProxyServer[]) => void) {
  console.log("Subscribing to proxy servers for user:", userId);

  try {
    const q = query(collection(db, proxyServersCollection), where("userId", "==", userId));

    return onSnapshot(q, (snapshot) => {
      console.log("Received proxy servers snapshot");
      const proxies = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name,
          host: data.host,
          port: data.port,
          location: data.location,
          isActive: data.isActive
        };
      });
      callback(proxies);
    }, (error) => {
      console.error("Error subscribing to proxy servers:", error);
      // Optionally reset the proxies list on error
      callback([]);
    });
  } catch (error) {
    console.error("Error setting up proxy servers subscription:", error);
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }
}

export async function addProxyServer(userId: string, proxy: Omit<ProxyServer, "id" | "userId">) {
  try {
    console.log("Adding proxy server for user:", userId);
    const docRef = await addDoc(collection(db, proxyServersCollection), {
      ...proxy,
      userId,
      isActive: false,
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding proxy server:", error);
    throw error;
  }
}

export async function updateProxyServer(id: string, data: Partial<ProxyServer>) {
  try {
    console.log("Updating proxy server:", id);
    const docRef = doc(db, proxyServersCollection, id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error("Error updating proxy server:", error);
    throw error;
  }
}

export async function deleteProxyServer(id: string) {
  try {
    console.log("Deleting proxy server:", id);
    const docRef = doc(db, proxyServersCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting proxy server:", error);
    throw error;
  }
}

// Proxy Session Operations
export function subscribeToProxySessions(userId: string, callback: (sessions: ProxySession[]) => void) {
  console.log("Subscribing to proxy sessions for user:", userId);

  try {
    const q = query(collection(db, proxySessionsCollection), where("userId", "==", userId));

    return onSnapshot(q, (snapshot) => {
      console.log("Received proxy sessions snapshot");
      const sessions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          proxyId: data.proxyId,
          startTime: data.startTime.toDate(),
          endTime: data.endTime ? data.endTime.toDate() : null,
          bandwidthUsed: data.bandwidthUsed,
          averageLatency: data.averageLatency
        };
      });
      callback(sessions);
    }, (error) => {
      console.error("Error subscribing to proxy sessions:", error);
      callback([]);
    });
  } catch (error) {
    console.error("Error setting up proxy sessions subscription:", error);
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }
}

export async function addProxySession(userId: string, session: Omit<ProxySession, "id" | "userId">) {
  try {
    console.log("Adding proxy session for user:", userId);
    const docRef = await addDoc(collection(db, proxySessionsCollection), {
      ...session,
      userId,
      startTime: new Date(),
      endTime: null,
      bandwidthUsed: 0,
      averageLatency: null,
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding proxy session:", error);
    throw error;
  }
}

export async function updateProxySession(id: string, data: Partial<ProxySession>) {
  try {
    console.log("Updating proxy session:", id);
    const docRef = doc(db, proxySessionsCollection, id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error("Error updating proxy session:", error);
    throw error;
  }
}