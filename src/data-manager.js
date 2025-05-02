import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import firebaseAuthManager from "./firebaseAuth";

const db = getFirestore(firebaseAuthManager.auth.app);

async function createSession(userId, url, name) {
    try {
        const sessionsCollection = collection(db, 'users', userId, 'sessions');
        const newSession = {
            url,
            name,
            userId,
            createdAt: new Date(),
            updatedAt: new Date()
        }
        const docRef = await addDoc(sessionsCollection, newSession);
        console.log('Session created with ID:', docRef.id);
        return docRef.id;
    } catch (e) {
        console.error('Error creating session:', e);
        throw e;
    }
}

async function createUser(userId) {
    try {
        const usersCollection = collection(db, 'users');
        const newUser = {
            userId,
            createdAt: new Date(),
            updatedAt: new Date()
        }
        const docRef = await addDoc(usersCollection, newUser);
        console.log('User created with ID:', docRef.id);
    } catch (e) {
        console.error('Error creating user:', e);
        throw e;
    }
}

async function getSessions(userId) {
    try {
        const sessionsCollection = collection(db, 'users', userId, 'sessions');
        const querySnapshot = await getDocs(sessionsCollection);
        const sessions = [];
        querySnapshot.forEach((doc) => {
            sessions.push({ id: doc.id, ...doc.data() });
        });
        return sessions;
    } catch (e) {
        console.error('Error getting sessions:', e);
        throw e;
    }
}

async function updateSession(userId, sessionId, data) {
    try {
        const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
        await updateDoc(sessionDocRef, data);
        console.log('Session updated successfully.');
    } catch (e) {
        console.error('Error updating session:', e);
        throw e;
    }
}

async function deleteSession(userId, sessionId) {
    try {
        const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
        await deleteDoc(sessionDocRef);
        console.log('Session deleted successfully.');
    } catch (e) {
        console.error('Error deleting session:', e);
        throw e;
    }
}

async function getAllSessions() {
    try {
        const sessionsCollection = collection(db, 'sessions');
        const querySnapshot = await getDocs(sessionsCollection);
        const sessions = [];
        querySnapshot.forEach((doc) => {
            sessions.push({ id: doc.id, ...doc.data() });
        });
        return sessions;
    } catch (e) {
        console.error('Error getting sessions:', e);
        throw e;
    }
}

async function createSessionInSessionsCollection(session) {
    try {
        const sessionsCollection = collection(db, 'sessions');
        const docRef = await addDoc(sessionsCollection, session);
        console.log('Session created in sessions collection with ID:', docRef.id);
        return docRef.id;
    } catch (e) {
        console.error('Error creating session:', e);
        throw e;
    }
}

async function getSessionData(userId, sessionId) {
    try {
        const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
        const docSnap = await getDoc(sessionDocRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.error('Session not found');
            return null;
        }
    } catch (e) {
        console.error('Error getting session data:', e);
        throw e;
    }
}

export { createSession, getSessions, updateSession, deleteSession, getAllSessions, createSessionInSessionsCollection, createUser, getSessionData };