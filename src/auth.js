import firebaseAuthManager from './firebaseAuth.js';

// Auth functions

export const signInWithEmailAndPassword = async (email, password) => {
    try {
        const user = await firebaseAuthManager.login(email, password);
        return user;
    } catch (error) {
        throw handleAuthError(error);
    }
};

export const createUserWithEmailAndPassword = async (email, password) => {
    try {        
        const user = await firebaseAuthManager.register(email, password);
        return user;
    } catch (error) {
        throw handleAuthError(error);
    }
};

export const signOut = async () => {
    try {
        await firebaseAuthManager.logout();
    } catch (error) {
        throw handleAuthError(error);
    }
};

function handleAuthError(error) {
    const errorCode = error.code;
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return new Error('This email is already in use.');
        case 'auth/invalid-email':
            return new Error('Invalid email address.');
        case 'auth/user-disabled':
            return new Error('This user account has been disabled.');
        case 'auth/user-not-found':
            return new Error('User not found.');
        case 'auth/wrong-password':
            return new Error('Incorrect password.');
        case 'auth/network-request-failed':
            return new Error('Network error. Please check your connection.');
        default:
            console.error('Unhandled auth error:', error);
            return new Error('An unexpected error occurred. Please try again later.');
    }
}
