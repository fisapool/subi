export interface Settings {
    autoSave: boolean;
    autoSaveInterval: number;
    encryptData: boolean;
}

export interface MessageResponse {
    success: boolean;
    error?: string;
    sessions?: Session[];
    token?: string;
}

export interface Session {
    id: string;
    name: string;
    tabs: Tab[];
    createdAt: number;
}

export interface Tab {
    url: string;
}

export interface ChromeAPI {
    storage: {
        local: {
            get: (key?: string | string[] | object) => Promise<any>;
            set: (items: object) => Promise<void>;
        };
    };
    runtime: {
        sendMessage: (message: any) => Promise<MessageResponse>;
    };
} 