import authManager from './auth.js';

class SyncManager {
  constructor() {
    this.API_BASE_URL = 'https://api.bytescookies.com';
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
    this.lastSyncTime = null;
    this.syncInProgress = false;
  }

  // Initialize sync manager
  async init() {
    try {
      const { lastSyncTime } = await chrome.storage.local.get(['lastSyncTime']);
      this.lastSyncTime = lastSyncTime || null;
      
      // Start periodic sync
      this.startPeriodicSync();
      
      // Perform initial sync if user is authenticated
      if (authManager.isAuthenticated()) {
        await this.sync();
      }
    } catch (error) {
      console.error('Sync initialization error:', error);
    }
  }

  // Start periodic sync
  startPeriodicSync() {
    setInterval(async () => {
      if (authManager.isAuthenticated() && !this.syncInProgress) {
        await this.sync();
      }
    }, this.syncInterval);
  }

  // Perform sync operation
  async sync() {
    if (this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      
      // Get local data
      const localData = await this.getLocalData();
      
      // Get remote data
      const remoteData = await this.getRemoteData();
      
      // Merge data
      const mergedData = await this.mergeData(localData, remoteData);
      
      // Update both local and remote
      await Promise.all([
        this.updateLocalData(mergedData),
        this.updateRemoteData(mergedData)
      ]);
      
      this.lastSyncTime = Date.now();
      await chrome.storage.local.set({ lastSyncTime: this.lastSyncTime });
      
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Get local data
  async getLocalData() {
    const data = await chrome.storage.local.get([
      'tasks',
      'settings',
      'activityLogs',
      'focusModeSettings',
      'meetingModeSettings'
    ]);
    return data;
  }

  // Get remote data
  async getRemoteData() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/sync/get`, {
        headers: {
          'Authorization': `Bearer ${authManager.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch remote data');
      }

      return await response.json();
    } catch (error) {
      console.error('Remote data fetch error:', error);
      return null;
    }
  }

  // Merge local and remote data
  async mergeData(localData, remoteData) {
    if (!remoteData) return localData;

    const merged = {
      tasks: this.mergeTasks(localData.tasks || [], remoteData.tasks || []),
      settings: { ...remoteData.settings, ...localData.settings },
      activityLogs: this.mergeActivityLogs(localData.activityLogs || [], remoteData.activityLogs || []),
      focusModeSettings: { ...remoteData.focusModeSettings, ...localData.focusModeSettings },
      meetingModeSettings: { ...remoteData.meetingModeSettings, ...localData.meetingModeSettings }
    };

    return merged;
  }

  // Merge tasks arrays
  mergeTasks(localTasks, remoteTasks) {
    const taskMap = new Map();
    
    // Add all tasks to map, using last modified time to resolve conflicts
    [...localTasks, ...remoteTasks].forEach(task => {
      const existing = taskMap.get(task.id);
      if (!existing || new Date(task.lastModified) > new Date(existing.lastModified)) {
        taskMap.set(task.id, task);
      }
    });
    
    return Array.from(taskMap.values());
  }

  // Merge activity logs
  mergeActivityLogs(localLogs, remoteLogs) {
    const logMap = new Map();
    
    [...localLogs, ...remoteLogs].forEach(log => {
      const key = `${log.timestamp}-${log.domain}`;
      const existing = logMap.get(key);
      if (!existing || new Date(log.timestamp) > new Date(existing.timestamp)) {
        logMap.set(key, log);
      }
    });
    
    return Array.from(logMap.values());
  }

  // Update local data
  async updateLocalData(data) {
    await chrome.storage.local.set(data);
  }

  // Update remote data
  async updateRemoteData(data) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/sync/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authManager.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update remote data');
      }
    } catch (error) {
      console.error('Remote data update error:', error);
      throw error;
    }
  }

  // Get last sync time
  getLastSyncTime() {
    return this.lastSyncTime;
  }

  // Force immediate sync
  async forceSync() {
    return await this.sync();
  }
}

// Export singleton instance
const syncManager = new SyncManager();
export default syncManager; 