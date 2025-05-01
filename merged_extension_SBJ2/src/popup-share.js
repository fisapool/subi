// Import required utilities
import { SessionSharing } from './utils/session-sharing.js';
import { NotificationManager } from './utils/notification-manager.js';
import { SecurityManager } from './utils/security.js';
import { ErrorHandler } from './utils/error-handler.js';

class PopupShareManager {
    constructor() {
        this.sessionSharing = new SessionSharing(new SecurityManager());
        this.notificationManager = new NotificationManager();
        this.errorHandler = new ErrorHandler();
        this.currentSession = null;
        this.isSharing = false;

        // Initialize UI elements
        this.initializeUI();
        this.attachEventListeners();
        this.loadCurrentSession();
    }

    initializeUI() {
        // Tab navigation
        this.shareTab = document.getElementById('shareTab');
        this.receiveTab = document.getElementById('receiveTab');
        this.shareTabBtn = document.getElementById('shareTabBtn');
        this.receiveTabBtn = document.getElementById('receiveTabBtn');

        // Share tab elements
        this.sessionNameElement = document.getElementById('currentSessionName');
        this.sessionDateElement = document.getElementById('sessionDateText');
        this.sessionTabCount = document.getElementById('sessionTabCount');
        this.shareToken = document.getElementById('shareToken');
        this.copyTokenBtn = document.getElementById('copyToken');
        this.generateTokenBtn = document.getElementById('generateToken');
        this.cancelShareBtn = document.getElementById('cancelShare');
        
        // Security options
        this.expirySelect = document.getElementById('expiryTime');
        this.encryptDataCheckbox = document.getElementById('encryptData');
        this.oneTimeUseCheckbox = document.getElementById('oneTimeUse');

        // Receive tab elements
        this.accessTokenInput = document.getElementById('accessToken');
        this.accessSessionBtn = document.getElementById('accessSession');
        this.cancelReceiveBtn = document.getElementById('cancelReceive');

        // Status message
        this.statusMessage = document.getElementById('statusMessage');
    }

    attachEventListeners() {
        // Tab navigation
        this.shareTabBtn.addEventListener('click', () => this.showTab('share'));
        this.receiveTabBtn.addEventListener('click', () => this.showTab('receive'));

        // Share functionality
        this.generateTokenBtn.addEventListener('click', () => this.handleShare());
        this.copyTokenBtn.addEventListener('click', () => this.copyTokenToClipboard());
        this.cancelShareBtn.addEventListener('click', () => window.close());

        // Receive functionality
        this.accessSessionBtn.addEventListener('click', () => this.handleAccess());
        this.cancelReceiveBtn.addEventListener('click', () => window.close());

        // Handle Enter key in access token input
        this.accessTokenInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.handleAccess();
            }
        });
    }

    showTab(tabName) {
        if (tabName === 'share') {
            this.shareTab.style.display = 'block';
            this.receiveTab.style.display = 'none';
            this.shareTabBtn.classList.add('btn-primary');
            this.shareTabBtn.classList.remove('btn-outline');
            this.receiveTabBtn.classList.add('btn-outline');
            this.receiveTabBtn.classList.remove('btn-primary');
        } else {
            this.shareTab.style.display = 'none';
            this.receiveTab.style.display = 'block';
            this.receiveTabBtn.classList.add('btn-primary');
            this.receiveTabBtn.classList.remove('btn-outline');
            this.shareTabBtn.classList.add('btn-outline');
            this.shareTabBtn.classList.remove('btn-primary');
        }
    }

    async loadCurrentSession() {
        try {
            // Get current window's tabs
            const tabs = await chrome.tabs.query({ currentWindow: true });
            
            // Update UI with session info
            this.currentSession = {
                name: `Session ${new Date().toLocaleString()}`,
                tabs: tabs,
                createdAt: Date.now()
            };

            this.sessionNameElement.textContent = this.currentSession.name;
            this.sessionDateElement.textContent = new Date().toLocaleDateString();
            this.sessionTabCount.textContent = `${tabs.length} tabs`;
        } catch (error) {
            this.errorHandler.handle(error);
            this.showStatus('Error loading session information', 'error');
        }
    }

    async handleShare() {
        if (this.isSharing) return;
        this.isSharing = true;

        try {
            this.updateShareUI('processing');

            // Package session for sharing
            const { token, package: sharePackage } = await this.sessionSharing.packageSessionForSharing(
                this.currentSession,
                this.currentSession.tabs,
                {
                    expiryHours: parseInt(this.expirySelect.value),
                    encrypt: this.encryptDataCheckbox.checked,
                    oneTimeUse: this.oneTimeUseCheckbox.checked
                }
            );

            // Store the share package
            await chrome.storage.local.set({ [token]: sharePackage });

            // Update UI with token
            this.shareToken.textContent = token;
            this.updateShareUI('success');
            this.showStatus('Session shared successfully', 'success');

        } catch (error) {
            this.errorHandler.handle(error);
            this.updateShareUI('error');
            this.showStatus('Failed to share session', 'error');
        } finally {
            this.isSharing = false;
        }
    }

    async handleAccess() {
        const token = this.accessTokenInput.value.trim();
        
        if (!token) {
            this.showStatus('Please enter a share token', 'error');
            this.accessTokenInput.focus();
            return;
        }

        try {
            this.updateAccessUI('processing');

            // Get the shared package
            const result = await chrome.storage.local.get(token);
            if (!result[token]) {
                throw new Error('Invalid or expired share token');
            }

            // Restore the shared session
            const sharePackage = result[token];
            const restoreResult = await this.sessionSharing.restoreSharedSession(sharePackage);

            // If one-time use, remove the token
            if (sharePackage.sessionData.oneTimeUse) {
                await chrome.storage.local.remove(token);
            }

            this.updateAccessUI('success');
            this.showStatus('Session accessed successfully', 'success');
            setTimeout(() => window.close(), 1500);

        } catch (error) {
            this.errorHandler.handle(error);
            this.updateAccessUI('error');
            this.showStatus(error.message || 'Failed to access session', 'error');
        }
    }

    async copyTokenToClipboard() {
        try {
            const token = this.shareToken.textContent;
            await navigator.clipboard.writeText(token);
            this.showStatus('Token copied to clipboard', 'success');
        } catch (error) {
            this.errorHandler.handle(error);
            this.showStatus('Failed to copy token', 'error');
        }
    }

    updateShareUI(state) {
        switch (state) {
            case 'processing':
                this.generateTokenBtn.disabled = true;
                this.generateTokenBtn.textContent = 'Sharing...';
                this.expirySelect.disabled = true;
                break;
            case 'success':
                this.generateTokenBtn.disabled = false;
                this.generateTokenBtn.textContent = 'Share Again';
                this.expirySelect.disabled = false;
                break;
            case 'error':
                this.generateTokenBtn.disabled = false;
                this.generateTokenBtn.textContent = 'Try Again';
                this.expirySelect.disabled = false;
                break;
            default:
                this.generateTokenBtn.disabled = false;
                this.generateTokenBtn.textContent = 'Share Session';
                this.expirySelect.disabled = false;
        }
    }

    updateAccessUI(state) {
        const accessBtn = this.accessSessionBtn;
        switch (state) {
            case 'processing':
                accessBtn.disabled = true;
                accessBtn.textContent = 'Accessing...';
                break;
            case 'success':
                accessBtn.disabled = false;
                accessBtn.textContent = 'Access Session';
                break;
            case 'error':
                accessBtn.disabled = false;
                accessBtn.textContent = 'Try Again';
                break;
        }
    }

    showStatus(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        this.statusMessage.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                this.statusMessage.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize the popup manager when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupShareManager();
});
