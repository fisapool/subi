// API Client for Session Buddy server communication
export class APIClient {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.endpoints = {
            sessions: '/sessions',
            validate: '/validate',
            revoke: '/revoke'
        };
    }

    // Helper method for making API requests
    async makeRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw new Error('Failed to communicate with session sharing server');
        }
    }

    // Store a session on the server
    async storeSession(sessionPackage) {
        return await this.makeRequest(this.endpoints.sessions, {
            method: 'POST',
            body: JSON.stringify(sessionPackage)
        });
    }

    // Retrieve a session from the server
    async getSession(token) {
        return await this.makeRequest(`${this.endpoints.sessions}/${token}`, {
            method: 'GET'
        });
    }

    // Validate a session token
    async validateToken(token) {
        return await this.makeRequest(`${this.endpoints.validate}/${token}`, {
            method: 'GET'
        });
    }

    // Revoke a session token
    async revokeToken(token) {
        return await this.makeRequest(`${this.endpoints.revoke}/${token}`, {
            method: 'POST'
        });
    }
}
