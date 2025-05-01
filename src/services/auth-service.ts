import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase';

export class AuthService {
  private auth;
  private provider;

  constructor() {
    const app = initializeApp(firebaseConfig);
    this.auth = getAuth(app);
    this.provider = new GoogleAuthProvider();
  }

  public async signIn(): Promise<{ user: any; error?: string }> {
    try {
      const result = await signInWithPopup(this.auth, this.provider);
      return { user: result.user };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  }

  public async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await signOut(this.auth);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public onAuthStateChanged(callback: (user: any) => void): () => void {
    return onAuthStateChanged(this.auth, callback);
  }

  public getCurrentUser(): any {
    return this.auth.currentUser;
  }

  public async getAuthToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }
} 