// Test suite for Session Buddy with J2Cookies
class ExtensionTestSuite {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    async runTests() {
        console.log('Starting test suite...');
        
        // Session Buddy Tests
        await this.testSessionManagement();
        
        // J2Cookies Tests
        await this.testCookieManagement();
        
        // Combined Features Tests
        await this.testCombinedFeatures();
        
        this.displayResults();
    }

    async testSessionManagement() {
        console.log('\nTesting Session Management Features:');
        
        // Test 1: Save Session
        await this.addTest('Save Current Session', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'SAVE_SESSION' });
            return response.success;
        });

        // Test 2: Load Session
        await this.addTest('Load Saved Session', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'LOAD_SESSION', sessionId: 'test-session' });
            return response.success;
        });

        // Test 3: Delete Session
        await this.addTest('Delete Session', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'DELETE_SESSION', sessionId: 'test-session' });
            return response.success;
        });

        // Test 4: Export Sessions
        await this.addTest('Export Sessions', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'EXPORT_SESSIONS' });
            return response.success;
        });

        // Test 5: Import Sessions
        await this.addTest('Import Sessions', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'IMPORT_SESSIONS', data: [] });
            return response.success;
        });
    }

    async testCookieManagement() {
        console.log('\nTesting Cookie Management Features:');
        
        // Test 1: Export Cookies
        await this.addTest('Export Cookies', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'EXPORT_COOKIES', domain: 'example.com' });
            return response.success;
        });

        // Test 2: Import Cookies
        await this.addTest('Import Cookies', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'IMPORT_COOKIES', cookies: [] });
            return response.success;
        });

        // Test 3: Clear Cookies
        await this.addTest('Clear Cookies', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'CLEAR_COOKIES', domain: 'example.com' });
            return response.success;
        });

        // Test 4: Backup Cookies
        await this.addTest('Backup Cookies', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'BACKUP_COOKIES' });
            return response.success;
        });

        // Test 5: Restore Cookies
        await this.addTest('Restore Cookies', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'RESTORE_COOKIES' });
            return response.success;
        });
    }

    async testCombinedFeatures() {
        console.log('\nTesting Combined Features:');
        
        // Test 1: Save Session with Cookies
        await this.addTest('Save Session with Cookies', async () => {
            const response = await chrome.runtime.sendMessage({ 
                action: 'SAVE_SESSION_WITH_COOKIES',
                sessionData: { tabs: [] },
                cookieData: { domain: 'example.com' }
            });
            return response.success;
        });

        // Test 2: Restore Session with Cookies
        await this.addTest('Restore Session with Cookies', async () => {
            const response = await chrome.runtime.sendMessage({ 
                action: 'RESTORE_SESSION_WITH_COOKIES',
                sessionId: 'test-session'
            });
            return response.success;
        });
    }

    async addTest(name, testFunction) {
        try {
            const result = await testFunction();
            this.results.push({ name, success: result });
            console.log(`${name}: ${result ? '✓' : '✗'}`);
        } catch (error) {
            this.results.push({ name, success: false, error });
            console.log(`${name}: ✗ (${error.message})`);
        }
    }

    displayResults() {
        console.log('\nTest Results:');
        const total = this.results.length;
        const passed = this.results.filter(r => r.success).length;
        const failed = total - passed;

        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);

        if (failed > 0) {
            console.log('\nFailed Tests:');
            this.results
                .filter(r => !r.success)
                .forEach(r => console.log(`- ${r.name}${r.error ? `: ${r.error.message}` : ''}`));
        }
    }
}

// Run the test suite
const testSuite = new ExtensionTestSuite();
testSuite.runTests(); 