// Script Manager Module
class ScriptManager {
    constructor() {
        this.storageKey = 'scripts';
    }

    async saveScript(scriptData) {
        try {
            const scriptObject = {
                id: `script-${Date.now()}`,
                name: scriptData.name,
                code: scriptData.code,
                matchPatterns: scriptData.matchPatterns || [],
                description: scriptData.description || '',
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            // Get existing scripts and add the new one
            const { scripts = [] } = await chrome.storage.local.get(this.storageKey);
            const updatedScripts = [...scripts, scriptObject];
            
            // Save to storage
            await chrome.storage.local.set({ [this.storageKey]: updatedScripts });
            
            return scriptObject;
        } catch (error) {
            console.error('Error saving script:', error);
            throw error;
        }
    }

    async updateScript(scriptId, scriptData) {
        try {
            const { scripts = [] } = await chrome.storage.local.get(this.storageKey);
            const scriptIndex = scripts.findIndex(s => s.id === scriptId);
            
            if (scriptIndex === -1) {
                throw new Error('Script not found');
            }

            // Update the script
            scripts[scriptIndex] = {
                ...scripts[scriptIndex],
                ...scriptData,
                lastModified: new Date().toISOString()
            };

            await chrome.storage.local.set({ [this.storageKey]: scripts });
            return scripts[scriptIndex];
        } catch (error) {
            console.error('Error updating script:', error);
            throw error;
        }
    }

    async deleteScript(scriptId) {
        try {
            const { scripts = [] } = await chrome.storage.local.get(this.storageKey);
            const updatedScripts = scripts.filter(s => s.id !== scriptId);
            await chrome.storage.local.set({ [this.storageKey]: updatedScripts });
            return true;
        } catch (error) {
            console.error('Error deleting script:', error);
            throw error;
        }
    }

    async getAllScripts() {
        try {
            const { scripts = [] } = await chrome.storage.local.get(this.storageKey);
            return scripts;
        } catch (error) {
            console.error('Error getting scripts:', error);
            throw error;
        }
    }

    async getScriptsForUrl(url) {
        try {
            const scripts = await this.getAllScripts();
            return scripts.filter(script => 
                script.matchPatterns.some(pattern => new RegExp(pattern).test(url))
            );
        } catch (error) {
            console.error('Error getting scripts for URL:', error);
            throw error;
        }
    }

    async validateScript(scriptData) {
        // Basic validation
        if (!scriptData.name || !scriptData.code) {
            throw new Error('Script name and code are required');
        }

        // Validate match patterns
        if (scriptData.matchPatterns) {
            for (const pattern of scriptData.matchPatterns) {
                try {
                    new RegExp(pattern);
                } catch (error) {
                    throw new Error(`Invalid match pattern: ${pattern}`);
                }
            }
        }

        // Try to parse the code as a function
        try {
            new Function(scriptData.code);
        } catch (error) {
            throw new Error('Invalid JavaScript code');
        }

        return true;
    }
}

// Export the ScriptManager class
export default ScriptManager; 