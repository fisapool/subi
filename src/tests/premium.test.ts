import { describe, it, expect, vi, beforeEach } from 'vitest';
import premiumManager from '../premium.js';

describe('Premium Manager', () => {
  let mockChrome: any;
  let mockDocument: any;

  beforeEach(() => {
    // Mock chrome.storage
    mockChrome = {
      storage: {
        local: {
          get: vi.fn()
        }
      },
      runtime: {
        sendMessage: vi.fn()
      }
    };
    vi.stubGlobal('chrome', mockChrome);

    // Mock document
    mockDocument = {
      querySelectorAll: vi.fn()
    };
    vi.stubGlobal('document', mockDocument);
  });

  it('should check premium features correctly', () => {
    expect(premiumManager.isPremiumFeature('sessionSnippets')).toBe(true);
    expect(premiumManager.isPremiumFeature('advancedActivityLog')).toBe(true);
    expect(premiumManager.isPremiumFeature('nonExistentFeature')).toBe(false);
  });

  it('should check premium access status', async () => {
    // Mock premium user
    mockChrome.storage.local.get.mockResolvedValue({
      currentUser: { premium: true }
    });

    const hasPremium = await premiumManager.hasPremiumAccess();
    expect(hasPremium).toBe(true);
    expect(mockChrome.storage.local.get).toHaveBeenCalledWith('currentUser');
  });

  it('should handle storage errors when checking premium access', async () => {
    // Mock storage error
    mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

    const hasPremium = await premiumManager.hasPremiumAccess();
    expect(hasPremium).toBe(false);
  });

  it('should show upgrade prompt for premium features', () => {
    premiumManager.showUpgradePrompt('sessionSnippets');

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'showUpgradePrompt',
      message: 'Upgrade to Premium to access sessionSnippets!'
    });
  });

  it('should gate premium features correctly', async () => {
    const callback = vi.fn();

    // Test non-premium feature
    await premiumManager.gateFeature('nonExistentFeature', callback);
    expect(callback).toHaveBeenCalled();

    // Test premium feature with premium access
    mockChrome.storage.local.get.mockResolvedValue({
      currentUser: { premium: true }
    });
    callback.mockClear();
    await premiumManager.gateFeature('sessionSnippets', callback);
    expect(callback).toHaveBeenCalled();

    // Test premium feature without premium access
    mockChrome.storage.local.get.mockResolvedValue({
      currentUser: { premium: false }
    });
    callback.mockClear();
    await premiumManager.gateFeature('sessionSnippets', callback);
    expect(callback).not.toHaveBeenCalled();
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
  });

  it('should update UI based on premium status', async () => {
    // Mock premium elements
    const mockElements = [
      { dataset: { premium: 'sessionSnippets' }, classList: { remove: vi.fn(), add: vi.fn() } },
      { dataset: { premium: 'advancedActivityLog' }, classList: { remove: vi.fn(), add: vi.fn() } }
    ];
    mockDocument.querySelectorAll.mockReturnValue(mockElements);

    // Test with premium access
    mockChrome.storage.local.get.mockResolvedValue({
      currentUser: { premium: true }
    });
    await premiumManager.updateUI();

    mockElements.forEach(element => {
      expect(element.classList.remove).toHaveBeenCalledWith('premium-locked');
      expect(element.classList.add).toHaveBeenCalledWith('premium-unlocked');
    });

    // Test without premium access
    mockChrome.storage.local.get.mockResolvedValue({
      currentUser: { premium: false }
    });
    await premiumManager.updateUI();

    mockElements.forEach(element => {
      expect(element.classList.remove).toHaveBeenCalledWith('premium-unlocked');
      expect(element.classList.add).toHaveBeenCalledWith('premium-locked');
    });
  });
}); 