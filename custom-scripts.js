// Custom Scripts Manager
class CustomScriptsManager {
    constructor() {
        this.scripts = new Map();
        this.loadScripts();
    }

    // Load scripts from storage
    async loadScripts() {
        const result = await chrome.storage.sync.get('customScripts');
        this.scripts = new Map(Object.entries(result.customScripts || {}));
    }

    // Save scripts to storage
    async saveScripts() {
        await chrome.storage.sync.set({
            customScripts: Object.fromEntries(this.scripts)
        });
    }

    // Add a new script
    async addScript(name, code, enabled = true) {
        this.scripts.set(name, {
            code,
            enabled,
            lastModified: Date.now()
        });
        await this.saveScripts();
    }

    // Remove a script
    async removeScript(name) {
        this.scripts.delete(name);
        await this.saveScripts();
    }

    // Toggle script enabled state
    async toggleScript(name) {
        const script = this.scripts.get(name);
        if (script) {
            script.enabled = !script.enabled;
            await this.saveScripts();
        }
    }

    // Execute a script
    async executeScript(name) {
        const script = this.scripts.get(name);
        if (!script || !script.enabled) return;

        try {
            // Execute in the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: new Function(script.code)
                });
            }
        } catch (error) {
            console.error(`Error executing script ${name}:`, error);
        }
    }

    // Get all scripts
    getAllScripts() {
        return Array.from(this.scripts.entries()).map(([name, data]) => ({
            name,
            ...data
        }));
    }
}

// Export the manager
const customScriptsManager = new CustomScriptsManager();
export default customScriptsManager; 