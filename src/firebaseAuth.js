import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDgDMwjDAHzsffoWW_ZQ3CLbrJIRMr0HhI",
  authDomain: "cloudsync-c2a38.firebaseapp.com",
  projectId: "cloudsync-c2a38",
  storageBucket: "cloudsync-c2a38.appspot.com",
  messagingSenderId: "506409274388",
  appId: '1:506409274388:web:711e88f1e83b3e9f691b89',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
class FirebaseAuthManager {
  constructor() {
    this.currentUser = null;
    this.auth = auth;

    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
    });
    onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
    });
  }

  async register(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      this.currentUser = userCredential.user;
      return userCredential.user;
    } catch (error) {      
      throw error;
    }
  }

  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      this.currentUser = userCredential.user;
      return userCredential.user;
    } catch (error) {      
      throw error;
    }
  }

  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(this.auth, googleProvider);
      this.currentUser = result.user;
      return result.user;
    } catch (error) {      
      throw error;
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
      this.currentUser = null;
    } catch (error) {      
      throw error;
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }
}

const firebaseAuthManager = new FirebaseAuthManager();
export default firebaseAuthManager;

