
import jwt from 'jsonwebtoken';
import { auth } from '../firebase';
import type { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthService {
  static async generateProxyToken(user: User): Promise<string> {
    return jwt.sign(
      { 
        uid: user.uid,
        credits: user.credits,
        type: 'proxy_access'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static async verifyProxyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid proxy token');
    }
  }
}
