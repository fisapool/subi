export interface Session {
  id: string;
  name: string;
  tabs: Tab[];
  createdAt: number;
  updatedAt: number;
  groupId?: string;
  isPinned?: boolean;
  metadata?: Record<string, any>;
}

export interface Tab {
  id: string;
  url: string;
  title: string;
  favIconUrl?: string;
  isActive?: boolean;
  isPinned?: boolean;
  metadata?: Record<string, any>;
}

export interface SessionGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  metadata?: Record<string, any>;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  syncEnabled: boolean;
  backupEnabled: boolean;
  autoSaveInterval: number;
  defaultGroupId?: string;
  metadata?: Record<string, any>;
}

export interface SyncState {
  lastSyncTime: number;
  syncStatus: 'idle' | 'syncing' | 'error';
  error?: string;
  metadata?: Record<string, any>;
} 