declare module '../../session-snippets' {
    export interface Tab {
        url: string;
        title?: string;
        favIconUrl?: string;
    }

    export interface Cookie {
        name: string;
        value: string;
        domain: string;
        path: string;
        secure?: boolean;
        httpOnly?: boolean;
        sameSite?: string;
        expirationDate?: number;
    }

    export interface FormData {
        [key: string]: string;
    }

    export class SessionSnippet {
        name: string;
        tabs: Tab[];
        cookies: { [domain: string]: Cookie[] };
        forms: { [url: string]: { [formIndex: string]: FormData } };

        constructor(
            name: string,
            tabs?: Tab[],
            cookies?: { [domain: string]: Cookie[] },
            forms?: { [url: string]: { [formIndex: string]: FormData } }
        );
    }

    export function saveCurrentSession(name: string): Promise<SessionSnippet>;
    export function restoreSession(snippet: SessionSnippet): Promise<chrome.windows.Window>;
    export function getSavedSessions(): Promise<SessionSnippet[]>;
    export function deleteSession(snippetName: string): Promise<void>;
}