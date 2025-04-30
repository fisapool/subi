export interface Settings {
  autoSave: boolean;
  autoSaveInterval: number;
  encryptData: boolean;
}

export interface Session {
  id: string;
  name: string;
  tabs: Tab[];
  createdAt: number;
}

export interface Tab {
  url: string;
  title?: string;
  favIconUrl?: string;
}

export interface MessageResponse {
  success: boolean;
  error?: string;
  sessions?: Session[];
  token?: string;
}

export interface ChromeAPI {
  storage: {
    local: {
      get: (keys: string | string[]) => Promise<{ settings?: Settings }>;
      set: (items: { settings: Settings }) => Promise<void>;
    };
  };
  runtime: {
    sendMessage: (message: any) => Promise<MessageResponse>;
  };
} 