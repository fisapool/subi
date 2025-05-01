import { Session, Tab } from '../types/types';

export class UtilsService {
  public generateId(): string {
    return crypto.randomUUID();
  }

  public formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  public async getFaviconUrl(url: string): Promise<string> {
    try {
      const faviconUrl = new URL('/favicon.ico', url).href;
      const response = await fetch(faviconUrl);
      if (response.ok) {
        return faviconUrl;
      }
    } catch (error) {
      console.error('Error fetching favicon:', error);
    }
    return 'default-favicon.png';
  }

  public async getTabInfo(tabId: number): Promise<Tab | null> {
    try {
      const tab = await chrome.tabs.get(tabId);
      return {
        id: tab.id?.toString() || this.generateId(),
        url: tab.url || '',
        title: tab.title || '',
        favIconUrl: tab.favIconUrl,
        isActive: tab.active,
        isPinned: tab.pinned
      };
    } catch (error) {
      console.error('Error getting tab info:', error);
      return null;
    }
  }

  public async getAllTabs(): Promise<Tab[]> {
    try {
      const tabs = await chrome.tabs.query({});
      return tabs.map(tab => ({
        id: tab.id?.toString() || this.generateId(),
        url: tab.url || '',
        title: tab.title || '',
        favIconUrl: tab.favIconUrl,
        isActive: tab.active,
        isPinned: tab.pinned
      }));
    } catch (error) {
      console.error('Error getting all tabs:', error);
      return [];
    }
  }

  public async createSessionFromCurrentTabs(name: string): Promise<Session> {
    const tabs = await this.getAllTabs();
    return {
      id: this.generateId(),
      name,
      tabs,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  public async restoreSession(session: Session): Promise<void> {
    try {
      // Close existing tabs if needed
      const existingTabs = await chrome.tabs.query({});
      await Promise.all(existingTabs.map(tab => chrome.tabs.remove(tab.id!)));

      // Create new tabs
      for (const tab of session.tabs) {
        await chrome.tabs.create({
          url: tab.url,
          active: tab.isActive,
          pinned: tab.isPinned
        });
      }
    } catch (error) {
      console.error('Error restoring session:', error);
      throw error;
    }
  }
} 