declare namespace chrome {
  export interface Tab {
    id?: number;
    url?: string;
    title?: string;
    active?: boolean;
    pinned?: boolean;
    windowId?: number;
    favIconUrl?: string;
  }

  export interface Cookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    expirationDate?: number;
  }

  export interface Window {
    id: number;
  }

  export interface ExecuteScriptResult {
    result: any;
  }

  export namespace tabs {
    function query(queryInfo: { currentWindow?: boolean }): Promise<Tab[]>;
    function create(createProperties: { windowId?: number; url?: string }): Promise<Tab>;
    function executeScript(details: { target: { tabId: number }; func: () => void }): Promise<void>;
  }

  export namespace cookies {
    function getAll(details: { domain: string }): Promise<Cookie[]>;
    function set(details: Cookie & { url: string }): Promise<void>;
  }

  export namespace windows {
    function create(createProperties?: {}): Promise<Window>;
  }

  export namespace storage {
    interface StorageArea {
      get(keys: string | string[]): Promise<{ [key: string]: any }>;
      set(items: { [key: string]: any }): Promise<void>;
    }

    const local: StorageArea;
  }

  export namespace scripting {
    function executeScript(details: {
      target: { tabId: number };
      func: (data?: any) => void;
      args?: any[];
    }): Promise<ExecuteScriptResult[]>;
  }
} 