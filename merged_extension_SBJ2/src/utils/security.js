// Security utilities for Session Buddy with J2Cookies
export class SecurityManager {
    constructor() {
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
    }

    // Generate encryption key
    async generateKey() {
        return await crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // Encrypt session data
    async encryptData(data) {
        try {
            const key = await this.generateKey();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encodedData = this.encoder.encode(JSON.stringify(data));

            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv
                },
                key,
                encodedData
            );

            // Export key for storage
            const exportedKey = await crypto.subtle.exportKey('raw', key);

            return {
                encrypted: Array.from(new Uint8Array(encryptedData)),
                iv: Array.from(iv),
                key: Array.from(new Uint8Array(exportedKey))
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    // Decrypt session data
    async decryptData(encryptedData, keyData, iv) {
        try {
            // Convert arrays back to Uint8Arrays
            const key = await crypto.subtle.importKey(
                'raw',
                new Uint8Array(keyData),
                'AES-GCM',
                true,
                ['decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: new Uint8Array(iv)
                },
                key,
                new Uint8Array(encryptedData)
            );

            return JSON.parse(this.decoder.decode(decrypted));
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    // Validate session data
    validateSessionData(data) {
        const requiredFields = ['name', 'tabs', 'createdAt', 'category'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Invalid session data: missing ${missingFields.join(', ')}`);
        }

        if (!Array.isArray(data.tabs)) {
            throw new Error('Invalid session data: tabs must be an array');
        }

        // Validate individual tabs
        data.tabs.forEach((tab, index) => {
            if (!tab.url) {
                throw new Error(`Invalid tab data at index ${index}: missing URL`);
            }
            try {
                new URL(tab.url);
            } catch {
                throw new Error(`Invalid tab data at index ${index}: invalid URL`);
            }
        });

        return true;
    }

    // Sanitize session data
    sanitizeSessionData(data) {
        return {
            name: this.sanitizeString(data.name),
            tabs: data.tabs.map(tab => ({
                url: this.sanitizeString(tab.url),
                title: this.sanitizeString(tab.title),
                favIconUrl: this.sanitizeString(tab.favIconUrl)
            })),
            category: this.sanitizeString(data.category),
            createdAt: data.createdAt,
            expiresAt: data.expiresAt || Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days default
            favorite: !!data.favorite
        };
    }

    // Sanitize string values
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .trim();
    }

    // Validate shared session token
    validateShareToken(token) {
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid share token');
        }
        
        // Check token format (share_timestamp_randomstring)
        const tokenParts = token.split('_');
        if (tokenParts.length !== 3 || tokenParts[0] !== 'share') {
            throw new Error('Invalid share token format');
        }

        // Validate timestamp part
        const timestamp = parseInt(tokenParts[1]);
        if (isNaN(timestamp) || timestamp <= 0) {
            throw new Error('Invalid share token timestamp');
        }

        return true;
    }

    // Additional validation for shared session data
    validateSharedSessionData(data) {
        // First perform standard session validation
        this.validateSessionData(data);

        // Additional checks for shared sessions
        const sharedFields = ['sharedAt', 'expiresAt'];
        const missingFields = sharedFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Invalid shared session data: missing ${missingFields.join(', ')}`);
        }

        // Validate timestamps
        if (typeof data.sharedAt !== 'number' || data.sharedAt <= 0) {
            throw new Error('Invalid shared session data: invalid sharedAt timestamp');
        }

        if (typeof data.expiresAt !== 'number' || data.expiresAt <= data.sharedAt) {
            throw new Error('Invalid shared session data: invalid expiresAt timestamp');
        }

        return true;
    }

    // Encrypt shared session package
    async encryptSharedSession(sharePackage) {
        try {
            const key = await this.generateKey();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encodedData = this.encoder.encode(JSON.stringify(sharePackage));

            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv
                },
                key,
                encodedData
            );

            // Export key for storage
            const exportedKey = await crypto.subtle.exportKey('raw', key);

            return {
                encrypted: Array.from(new Uint8Array(encryptedData)),
                iv: Array.from(iv),
                key: Array.from(new Uint8Array(exportedKey)),
                metadata: {
                    encryptedAt: Date.now(),
                    version: '1.0'
                }
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt shared session');
        }
    }

    // Sanitize shared session data
    sanitizeSharedSessionData(data) {
        return {
            ...this.sanitizeSessionData(data),
            sharedAt: data.sharedAt,
            expiresAt: data.expiresAt,
            sharedBy: this.sanitizeString(data.sharedBy),
            shareToken: this.sanitizeString(data.shareToken)
        };
    }
}
