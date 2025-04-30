import { Storage } from './utils/storage';

export interface User {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user?: {
    id: number;
    email: string;
  };
}

export class Auth {
  private token: string | null = null;
  private user: { id: number; email: string } | null = null;

  async initialize(): Promise<void> {
    try {
      const data = await Storage.get('auth');
      if (data) {
        this.token = data.token;
        this.user = data.user;
      }
    } catch (error) {
      throw new Error('Failed to initialize auth');
    }
  }

  async register(user: User): Promise<void> {
    try {
      const response = await fetch('https://api.example.com/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data: AuthResponse = await response.json();
      this.token = data.token;
      this.user = data.user || null;
      
      await Storage.set('auth', { token: this.token, user: this.user });
    } catch (error: any) {
      throw new Error(error.message || 'Registration error');
    }
  }

  async login(credentials: User): Promise<void> {
    try {
      const response = await fetch('https://api.example.com/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data: AuthResponse = await response.json();
      this.token = data.token;
      this.user = data.user || null;
      
      await Storage.set('auth', { token: this.token, user: this.user });
    } catch (error: any) {
      throw new Error(error.message || 'Login error');
    }
  }

  async logout(): Promise<void> {
    try {
      await Storage.remove('auth');
      this.token = null;
      this.user = null;
    } catch (error: any) {
      throw new Error(error.message || 'Logout error');
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getCurrentUser(): { id: number; email: string } | null {
    return this.user;
  }
} 