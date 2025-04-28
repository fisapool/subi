import customScriptsManager from './custom-scripts.js';

// DOM Elements
const scriptsList = document.getElementById('scriptsList');
const addScriptButton = document.getElementById('addScript');
const statusDiv = document.getElementById('status');

// Show status message
function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    statusDiv.className = `status ${isError ? 'error' : 'success'}`;
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// Render scripts list
async function renderScripts() {
    const scripts = customScriptsManager.getAllScripts();
    scriptsList.innerHTML = '';

    scripts.forEach(script => {
        const scriptElement = document.createElement('div');
        scriptElement.className = 'script-item';
        scriptElement.innerHTML = `
            <span class="script-name">${script.name}</span>
            <div class="script-actions">
                <label class="toggle-switch">
                    <input type="checkbox" ${script.enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
                <button class="run-script">Run</button>
                <button class="edit-script">Edit</button>
                <button class="delete-script">Delete</button>
            </div>
        `;

        // Add event listeners
        const toggleSwitch = scriptElement.querySelector('input[type="checkbox"]');
        toggleSwitch.addEventListener('change', async () => {
            await customScriptsManager.toggleScript(script.name);
            showStatus(`Script ${script.name} ${toggleSwitch.checked ? 'enabled' : 'disabled'}`);
        });

        const runButton = scriptElement.querySelector('.run-script');
        runButton.addEventListener('click', async () => {
            await customScriptsManager.executeScript(script.name);
            showStatus(`Running script: ${script.name}`);
        });

        const editButton = scriptElement.querySelector('.edit-script');
        editButton.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });

        const deleteButton = scriptElement.querySelector('.delete-script');
        deleteButton.addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete "${script.name}"?`)) {
                await customScriptsManager.removeScript(script.name);
                showStatus(`Script "${script.name}" deleted`);
                renderScripts();
            }
        });

        scriptsList.appendChild(scriptElement);
    });
}

// Add new script button handler
addScriptButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// Initial render
renderScripts();

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.customScripts) {
        renderScripts();
    }
}); 