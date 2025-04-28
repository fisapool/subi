export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  expirationDate?: number;
  storeId?: string;
  hostOnly?: boolean;
  session?: boolean;
}

export interface CookieStore {
  id: string;
  name: string;
  cookies: Cookie[];
  createdAt: number;
  updatedAt: number;
}

export interface CookieManagerOptions {
  maxStores?: number;
  autoSave?: boolean;
  backupInterval?: number;
}

export interface CookieManagerState {
  stores: CookieStore[];
  currentStoreId: string | null;
  options: CookieManagerOptions;
} 