import { describe, it, expect, beforeEach, vi } from 'vitest';
import SessionManager from '../session-manager.js';

interface MockBrowser {
  cookies: {
    getAll: (details: { domain: string }) => Promise<any[]>;
    remove: (details: any) => Promise<void>;
    set: (details: any) => Promise<void>;
  };
  storage: {
    local: {
      get: (keys: string | string[]) => Promise<Record<string, any>>;
      set: (items: Record<string, any>) => Promise<void>;
      remove: (keys: string | string[]) => Promise<void>;
    };
  };
}

describe('SessionManager', () => {
  let mockBrowser: MockBrowser;

  beforeEach(() => {
    mockBrowser = {
      cookies: {
        getAll: vi.fn().mockResolvedValue([]),
        remove: vi.fn().mockResolvedValue(),
        set: vi.fn().mockResolvedValue(),
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(),
          remove: vi.fn().mockResolvedValue(),
        },
      },
    };
  });

  it('should instantiate with a mock browser', () => {
    const sessionManager = new SessionManager(null, mockBrowser);
    expect(sessionManager.browser).toBe(mockBrowser);
  });

  it('should call cookies.getAll when getSessionCookies is called', async () => {
    const sessionManager = new SessionManager(null, mockBrowser);
    await sessionManager.getSessionCookies('example.com');
    expect(mockBrowser.cookies.getAll).toHaveBeenCalledWith({ domain: 'example.com' });
  });

  it('should call storage.local.set when saveSession is called', async () => {
    const sessionManager = new SessionManager(null, mockBrowser);
    mockBrowser.cookies.getAll = vi.fn().mockResolvedValue([{ name: 'test', value: '123', domain: 'example.com', path: '/', secure: false, httpOnly: false, sameSite: 'Lax' }]);
    const result = await sessionManager.saveSession('testSession', 'example.com');
    expect(result).toBe(true);
    expect(mockBrowser.storage.local.set).toHaveBeenCalled();
  });

  it('should call storage.local.get when loadSession is called', async () => {
    const sessionManager = new SessionManager(null, mockBrowser);
    mockBrowser.storage.local.get = vi.fn().mockResolvedValue({
      session_testSession: {
        cookies: [{ name: 'test', value: '123', domain: 'example.com', path: '/', secure: false, httpOnly: false, sameSite: 'Lax' }],
        domain: 'example.com',
      },
    });
    const result = await sessionManager.loadSession('testSession');
    expect(result).toBe(true);
    expect(mockBrowser.storage.local.get).toHaveBeenCalledWith('session_testSession');
  });

  it('should call storage.local.remove when deleteSession is called', async () => {
    const sessionManager = new SessionManager(null, mockBrowser);
    const result = await sessionManager.deleteSession('testSession');
    expect(result).toBe(true);
    expect(mockBrowser.storage.local.remove).toHaveBeenCalledWith('session_testSession');
  });
});
