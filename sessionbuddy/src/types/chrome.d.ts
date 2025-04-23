// This file extends the Chrome types to ensure compatibility with our application

declare namespace chrome.cookies {
  interface Cookie {
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

  interface SetDetails {
    url?: string;
    name: string;
    value: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    expirationDate?: number;
    storeId?: string;
  }

  interface RemoveDetails {
    url: string;
    name: string;
    storeId?: string;
  }

  interface GetAllDetails {
    url?: string;
    name?: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    session?: boolean;
    storeId?: string;
  }

  function getAll(details: GetAllDetails): Promise<Cookie[]>;
  function set(details: SetDetails): Promise<Cookie | null>;
  function remove(details: RemoveDetails): Promise<RemoveDetails | null>;
}

declare namespace chrome.storage {
  interface StorageArea {
    get(keys: string | string[] | object | null): Promise<{ [key: string]: any }>;
    set(items: object): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
    clear(): Promise<void>;
  }

  const local: StorageArea;
  const sync: StorageArea;
} 