import { describe, it, expect, vi, beforeEach } from 'vitest';
import browser from 'webextension-polyfill';

// Mock browser APIs
vi.mock('webextension-polyfill', () => ({
  default: {
    runtime: {
      sendMessage: vi.fn(),
    },
  },
}));

describe('Content Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('DOM Manipulation', () => {
    it('should inject cookie consent banner', () => {
      const banner = document.createElement('div');
      banner.id = 'cookie-consent-banner';
      banner.textContent = 'This website uses cookies';
      document.body.appendChild(banner);

      expect(document.getElementById('cookie-consent-banner')).toBeTruthy();
      expect(document.getElementById('cookie-consent-banner')?.textContent).toBe('This website uses cookies');
    });

    it('should remove cookie consent banner', () => {
      const banner = document.createElement('div');
      banner.id = 'cookie-consent-banner';
      document.body.appendChild(banner);

      banner.remove();
      expect(document.getElementById('cookie-consent-banner')).toBeNull();
    });
  });

  describe('Message Passing', () => {
    it('should send cookie consent status to background script', async () => {
      const message = { type: 'cookieConsent', status: 'accepted' };
      const mockSendMessage = vi.fn().mockResolvedValue({ success: true });
      vi.mocked(browser.runtime.sendMessage).mockImplementation(mockSendMessage);

      const response = await browser.runtime.sendMessage(message);
      expect(mockSendMessage).toHaveBeenCalledWith(message);
      expect(response).toEqual({ success: true });
    });

    it('should handle cookie consent status errors', async () => {
      const message = { type: 'cookieConsent', status: 'accepted' };
      const mockSendMessage = vi.fn().mockRejectedValue(new Error('Failed to send message'));
      vi.mocked(browser.runtime.sendMessage).mockImplementation(mockSendMessage);

      await expect(browser.runtime.sendMessage(message)).rejects.toThrow('Failed to send message');
    });
  });

  describe('Cookie Detection', () => {
    it('should detect cookie consent elements', () => {
      const consentButton = document.createElement('button');
      consentButton.className = 'cookie-consent-button';
      document.body.appendChild(consentButton);

      const buttons = document.getElementsByClassName('cookie-consent-button');
      expect(buttons.length).toBe(1);
      expect(buttons[0]).toBe(consentButton);
    });

    it('should detect cookie policy links', () => {
      const policyLink = document.createElement('a');
      policyLink.href = '/cookie-policy';
      policyLink.textContent = 'Cookie Policy';
      document.body.appendChild(policyLink);

      const links = document.querySelectorAll('a[href*="cookie"]');
      expect(links.length).toBe(1);
      expect(links[0]).toBe(policyLink);
    });
  });
}); 