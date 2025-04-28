import SessionManager from './session-manager.js';
import ScriptManager from './script-manager.js';
import customScriptsManager from './custom-scripts.js';

// Initialize managers
const sessionManager = new SessionManager();
const scriptManager = new ScriptManager();

// DOM Elements
const sessionNameInput = document.getElementById('sessionName');
const saveSessionButton = document.getElementById('saveSession');
const sessionList = document.getElementById('sessionList');

const scriptNameInput = document.getElementById('scriptName');
const scriptDescriptionInput = document.getElementById('scriptDescription');
const scriptCodeInput = document.getElementById('scriptCode');
const matchPatternsInput = document.getElementById('matchPatterns');
const saveScriptButton = document.getElementById('saveScript');
const scriptList = document.getElementById('scriptList');

// Load initial data
document.addEventListener('DOMContentLoaded', async () => {
    await loadSessions();
    await loadScripts();
});

// Session Management
async function loadSessions() {
    try {
        const sessions = await sessionManager.getAllSessions();
        sessionList.innerHTML = '';

        sessions.forEach(session => {
            const sessionElement = createSessionElement(session);
            sessionList.appendChild(sessionElement);
        });
    } catch (error) {
        console.error('Error loading sessions:', error);
        showError('Failed to load sessions');
    }
}

function createSessionElement(session) {
    const div = document.createElement('div');
    div.className = 'list-item';
    
    const header = document.createElement('div');
    header.textContent = `${session.name} (${session.tabs.length} tabs)`;
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const restoreButton = document.createElement('button');
    restoreButton.textContent = 'Restore';
    restoreButton.onclick = () => restoreSession(session.id);
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete';
    deleteButton.onclick = () => deleteSession(session.id);
    
    actions.appendChild(restoreButton);
    actions.appendChild(deleteButton);
    
    div.appendChild(header);
    div.appendChild(actions);
    
    return div;
}

async function saveSession() {
    try {
        const name = sessionNameInput.value.trim();
        if (!name) {
            showError('Please enter a session name');
            return;
        }

        const scripts = await scriptManager.getAllScripts();
        await sessionManager.saveSession(name, scripts);
        
        sessionNameInput.value = '';
        await loadSessions();
        showSuccess('Session saved successfully');
    } catch (error) {
        console.error('Error saving session:', error);
        showError('Failed to save session');
    }
}

async function restoreSession(sessionId) {
    try {
        await sessionManager.restoreSession(sessionId);
        showSuccess('Session restored successfully');
    } catch (error) {
        console.error('Error restoring session:', error);
        showError('Failed to restore session');
    }
}

async function deleteSession(sessionId) {
    try {
        await sessionManager.deleteSession(sessionId);
        await loadSessions();
        showSuccess('Session deleted successfully');
    } catch (error) {
        console.error('Error deleting session:', error);
        showError('Failed to delete session');
    }
}

// Script Management
async function loadScripts() {
    try {
        const scripts = await scriptManager.getAllScripts();
        scriptList.innerHTML = '';

        scripts.forEach(script => {
            const scriptElement = createScriptElement(script);
            scriptList.appendChild(scriptElement);
        });
    } catch (error) {
        console.error('Error loading scripts:', error);
        showError('Failed to load scripts');
    }
}

function createScriptElement(script) {
    const div = document.createElement('div');
    div.className = 'list-item';
    
    const header = document.createElement('div');
    header.textContent = script.name;
    
    const description = document.createElement('div');
    description.textContent = script.description;
    description.style.color = '#666';
    description.style.fontSize = '0.9em';
    description.style.marginTop = '5px';
    
    const matchPatterns = document.createElement('div');
    matchPatterns.className = 'match-patterns';
    script.matchPatterns.forEach(pattern => {
        const span = document.createElement('span');
        span.className = 'match-pattern';
        span.textContent = pattern;
        matchPatterns.appendChild(span);
    });
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.onclick = () => editScript(script);
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete';
    deleteButton.onclick = () => deleteScript(script.id);
    
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    
    div.appendChild(header);
    div.appendChild(description);
    div.appendChild(matchPatterns);
    div.appendChild(actions);
    
    return div;
}

async function saveScript() {
    try {
        const name = scriptNameInput.value.trim();
        const description = scriptDescriptionInput.value.trim();
        const code = scriptCodeInput.value.trim();
        const matchPatterns = matchPatternsInput.value
            .split('\n')
            .map(p => p.trim())
            .filter(p => p);

        if (!name || !code) {
            showError('Please enter a script name and code');
            return;
        }

        const scriptData = {
            name,
            description,
            code,
            matchPatterns
        };

        // Validate the script
        await scriptManager.validateScript(scriptData);
        
        // Save the script
        await scriptManager.saveScript(scriptData);
        
        // Clear inputs
        scriptNameInput.value = '';
        scriptDescriptionInput.value = '';
        scriptCodeInput.value = '';
        matchPatternsInput.value = '';
        
        // Reload scripts
        await loadScripts();
        showSuccess('Script saved successfully');
    } catch (error) {
        console.error('Error saving script:', error);
        showError(error.message || 'Failed to save script');
    }
}

async function editScript(script) {
    scriptNameInput.value = script.name;
    scriptDescriptionInput.value = script.description;
    scriptCodeInput.value = script.code;
    matchPatternsInput.value = script.matchPatterns.join('\n');
}

async function deleteScript(scriptId) {
    try {
        await scriptManager.deleteScript(scriptId);
        await loadScripts();
        showSuccess('Script deleted successfully');
    } catch (error) {
        console.error('Error deleting script:', error);
        showError('Failed to delete script');
    }
}

// Event Listeners
saveSessionButton.addEventListener('click', saveSession);
saveScriptButton.addEventListener('click', saveScript);

// Utility Functions
function showError(message) {
    // You can implement a better error UI
    alert(`Error: ${message}`);
}

function showSuccess(message) {
    // You can implement a better success UI
    alert(message);
}

// Show status message
function showStatus(message, isError = false) {
    const statusDiv = document.createElement('div');
    statusDiv.textContent = message;
    statusDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 4px;
        background-color: ${isError ? '#f44336' : '#4CAF50'};
        color: white;
        z-index: 1000;
    `;
    document.body.appendChild(statusDiv);
    setTimeout(() => statusDiv.remove(), 3000);
}

// Render scripts list
async function renderScripts() {
    const scripts = customScriptsManager.getAllScripts();
    scriptList.innerHTML = '';

    scripts.forEach(script => {
        const scriptElement = document.createElement('div');
        scriptElement.className = 'list-item';
        scriptElement.innerHTML = `
            <div class="script-header">
                <h3>${script.name}</h3>
                <div class="actions">
                    <button class="edit-script">Edit</button>
                    <button class="delete-script">Delete</button>
                </div>
            </div>
            <div class="script-details">
                <p><strong>Last Modified:</strong> ${new Date(script.lastModified).toLocaleString()}</p>
                <p><strong>Status:</strong> ${script.enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
        `;

        // Add event listeners
        const editButton = scriptElement.querySelector('.edit-script');
        editButton.addEventListener('click', () => {
            scriptNameInput.value = script.name;
            scriptCodeInput.value = script.code;
            saveScriptButton.dataset.editMode = 'true';
            saveScriptButton.dataset.originalName = script.name;
        });

        const deleteButton = scriptElement.querySelector('.delete-script');
        deleteButton.addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete "${script.name}"?`)) {
                await customScriptsManager.removeScript(script.name);
                showStatus(`Script "${script.name}" deleted`);
                renderScripts();
            }
        });

        scriptList.appendChild(scriptElement);
    });
}

// Save script handler
saveScriptButton.addEventListener('click', async () => {
    const name = scriptNameInput.value.trim();
    const code = scriptCodeInput.value.trim();

    if (!name || !code) {
        showStatus('Please enter both name and code', true);
        return;
    }

    try {
        if (saveScriptButton.dataset.editMode === 'true') {
            // Delete old script if name changed
            if (saveScriptButton.dataset.originalName !== name) {
                await customScriptsManager.removeScript(saveScriptButton.dataset.originalName);
            }
            delete saveScriptButton.dataset.editMode;
            delete saveScriptButton.dataset.originalName;
        }

        await customScriptsManager.addScript(name, code);
        showStatus(`Script "${name}" saved successfully`);
        
        // Clear inputs
        scriptNameInput.value = '';
        scriptCodeInput.value = '';
        
        // Refresh list
        renderScripts();
    } catch (error) {
        console.error('Error saving script:', error);
        showStatus('Error saving script', true);
    }
});

// Initial render
renderScripts();

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.customScripts) {
        renderScripts();
    }
}); 