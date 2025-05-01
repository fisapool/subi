export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  expirationDate?: number;
}

export interface CookieOperation {
  name: string;
  arguments: any[];
}

export interface ExportResult {
  cookies: Cookie[];
  version: string;
  timestamp: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{ cookie: string; error: string }>;
}

export interface CookieError {
  cookie: string;
  error: string;
} 