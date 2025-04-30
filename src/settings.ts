import type { Settings, MessageResponse } from './types';

export const loadSettings = async (): Promise<Settings> => {
    const result = await chrome.storage.local.get('settings');
    return result.settings || {
        autoSave: false,
        autoSaveInterval: 30,
        encryptData: true
    };
};

export const saveSettings = async (settings: Settings): Promise<void> => {
    await chrome.storage.local.set({ settings });
};

export const validateSettings = (settings: Settings): Settings => {
    return {
        ...settings,
        autoSaveInterval: Math.min(Math.max(settings.autoSaveInterval, 5), 120)
    };
};

export const exportData = async (): Promise<MessageResponse> => {
    return chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });
};

export const importData = async (data: any): Promise<MessageResponse> => {
    const tokenResponse = await chrome.runtime.sendMessage({ type: 'GET_CSRF_TOKEN' });
    if (!tokenResponse.success) {
        return tokenResponse;
    }
    return chrome.runtime.sendMessage({
        type: 'IMPORT_SESSIONS',
        data,
        token: tokenResponse.token
    });
};

export const clearData = async (): Promise<MessageResponse> => {
    return chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' });
}; 