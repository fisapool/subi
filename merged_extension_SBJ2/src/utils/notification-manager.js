    // Notification manager for Session Buddy with J2Cookies
export class NotificationManager {
    constructor() {
        this.notificationDefaults = {
            type: 'basic',
            iconUrl: '/assets/logo-128.png'
        };
    }

    // Show session expiration warning
    async showExpirationWarning(sessionName, daysLeft) {
        return this.showNotification('session-expiration', {
            title: 'Session Expiring Soon',
            message: `Your session "${sessionName}" will expire in ${daysLeft} days. Please review or extend if needed.`,
            priority: 1
        });
    }

    // Show backup completion notification
    async showBackupComplete(sessionCount) {
        return this.showNotification('backup-complete', {
            title: 'Backup Complete',
            message: `Successfully backed up ${sessionCount} sessions.`,
            priority: 0
        });
    }

    // Show session recovery notification
    async showSessionRecovery(sessionName) {
        return this.showNotification('session-recovery', {
            title: 'Session Recovered',
            message: `Successfully recovered session "${sessionName}" from backup.`,
            priority: 1
        });
    }

    // Show encryption status notification
    async showEncryptionStatus(success, sessionName) {
        if (success) {
            return this.showNotification('encryption-success', {
                title: 'Session Encrypted',
                message: `Successfully encrypted session "${sessionName}".`,
                priority: 0
            });
        } else {
            return this.showNotification('encryption-failed', {
                title: 'Encryption Failed',
                message: `Failed to encrypt session "${sessionName}". Session saved without encryption.`,
                priority: 2
            });
        }
    }

    // Show import results notification
    async showImportResults(summary) {
        const { total, successful, failed } = summary;
        const message = failed > 0 
            ? `Imported ${successful} of ${total} sessions. ${failed} sessions failed to import.`
            : `Successfully imported ${total} sessions.`;

        return this.showNotification('import-complete', {
            title: 'Import Complete',
            message,
            priority: failed > 0 ? 1 : 0
        });
    }

    // Show storage warning notification
    async showStorageWarning(usedSpace, totalSpace) {
        const usedPercent = Math.round((usedSpace / totalSpace) * 100);
        if (usedPercent > 80) {
            return this.showNotification('storage-warning', {
                title: 'Storage Space Warning',
                message: `Session storage is ${usedPercent}% full. Consider exporting or removing old sessions.`,
                priority: 1
            });
        }
    }

    // Show quarantine notification
    async showQuarantineNotification(count) {
        return this.showNotification('sessions-quarantined', {
            title: 'Sessions Quarantined',
            message: `${count} sessions have been quarantined due to data integrity issues. Please review in settings.`,
            priority: 2
        });
    }

    // Show session shared notification
    async showSessionShared(sessionName, expiresIn) {
        return this.showNotification('session-shared', {
            title: 'Session Shared Successfully',
            message: `Session "${sessionName}" has been shared and will expire in ${expiresIn} hours.`,
            priority: 0
        });
    }

    // Show session access notification
    async showSessionAccessed(sessionName, accessedBy) {
        return this.showNotification('session-accessed', {
            title: 'Session Accessed',
            message: `Your shared session "${sessionName}" was accessed by ${accessedBy}.`,
            priority: 1
        });
    }

    // Show share expiration warning
    async showShareExpirationWarning(sessionName, hoursLeft) {
        return this.showNotification('share-expiration', {
            title: 'Shared Session Expiring Soon',
            message: `Your shared session "${sessionName}" will expire in ${hoursLeft} hours.`,
            priority: 1
        });
    }

    // Show share revoked notification
    async showShareRevoked(sessionName) {
        return this.showNotification('share-revoked', {
            title: 'Share Access Revoked',
            message: `Access to shared session "${sessionName}" has been revoked.`,
            priority: 1
        });
    }

    // Show cookie restoration status
    async showCookieRestorationStatus(sessionName, success, details) {
        if (success) {
            return this.showNotification('cookie-restore-success', {
                title: 'Cookies Restored Successfully',
                message: `Successfully restored cookies for shared session "${sessionName}".`,
                priority: 0
            });
        } else {
            return this.showNotification('cookie-restore-failed', {
                title: 'Cookie Restoration Failed',
                message: `Failed to restore some cookies for "${sessionName}". ${details}`,
                priority: 2
            });
        }
    }

    // Core notification method
    async showNotification(id, options) {
        try {
            // Check if notification permission is granted
            if (Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    console.warn('Notification permission denied');
                    return false;
                }
            }

            // Create and show notification
            await chrome.notifications.create(id, {
                ...this.notificationDefaults,
                ...options
            });

            return true;
        } catch (error) {
            console.error('Error showing notification:', error);
            return false;
        }
    }

    // Clear notification
    async clearNotification(id) {
        try {
            await chrome.notifications.clear(id);
            return true;
        } catch (error) {
            console.error('Error clearing notification:', error);
            return false;
        }
    }
}
