document.addEventListener('DOMContentLoaded', function() {
    // Theme Management
    const lightModeBtn = document.getElementById('lightModeBtn');
    const darkModeBtn = document.getElementById('darkModeBtn');
    
    // Load saved theme
    chrome.storage.sync.get('theme', function(data) {
        const theme = data.theme || 'light';
        document.body.setAttribute('data-theme', theme);
        updateThemeButtons(theme);
    });

    // Theme button handlers
    lightModeBtn.addEventListener('click', () => setTheme('light'));
    darkModeBtn.addEventListener('click', () => setTheme('dark'));

    function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        chrome.storage.sync.set({ theme: theme });
        updateThemeButtons(theme);
    }

    function updateThemeButtons(theme) {
        lightModeBtn.style.fontWeight = theme === 'light' ? 'bold' : 'normal';
        darkModeBtn.style.fontWeight = theme === 'dark' ? 'bold' : 'normal';
    }

    // Tab Navigation
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            button.classList.add('active');
            document.getElementById(button.dataset.tab + '-tab').classList.add('active');

            // Save active tab preference
            chrome.storage.sync.set({ activeTab: button.dataset.tab });
        });
    });

    // Load last active tab
    chrome.storage.sync.get('activeTab', function(data) {
        const activeTab = data.activeTab || 'sessions';
        document.querySelector(`[data-tab="${activeTab}"]`).click();
    });

    // Session Management
    const saveCurrentSessionBtn = document.getElementById('saveCurrentSessionBtn');
    saveCurrentSessionBtn.addEventListener('click', saveCurrentSession);

    async function saveCurrentSession() {
        try {
            const tabs = await chrome.tabs.query({ currentWindow: true });
            const sessionName = `Session ${new Date().toLocaleString()}`;
            const session = {
                name: sessionName,
                date: new Date().toISOString(),
                tabs: tabs.map(tab => ({
                    url: tab.url,
                    title: tab.title
                }))
            };

            // Load existing sessions and add new one
            chrome.storage.sync.get('sessions', function(data) {
                const sessions = data.sessions || [];
                sessions.unshift(session);
                chrome.storage.sync.set({ sessions: sessions }, function() {
                    loadSessions(); // Refresh the sessions list
                });
            });
        } catch (error) {
            console.error('Error saving session:', error);
        }
    }

    function loadSessions() {
        chrome.storage.sync.get('sessions', function(data) {
            const sessions = data.sessions || [];
            const tbody = document.getElementById('sessionsTableBody');
            tbody.innerHTML = sessions.map(session => `
                <tr>
                    <td>${session.name}</td>
                    <td>${new Date(session.date).toLocaleDateString()}</td>
                    <td>${session.tabs.length} Tabs</td>
                    <td>
                        <div class="table-actions">
                            <button class="button button-primary" onclick="restoreSession('${session.date}')">Restore</button>
                            <button class="button button-secondary" onclick="editSession('${session.date}')">Edit</button>
                            <button class="button button-secondary" onclick="deleteSession('${session.date}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        });
    }

    // Load initial sessions
    loadSessions();

    // Cookie Management
    function loadCookies() {
        chrome.cookies.getAll({}, function(cookies) {
            const tbody = document.getElementById('cookiesTableBody');
            tbody.innerHTML = cookies.map(cookie => `
                <tr>
                    <td>${cookie.name}</td>
                    <td>${cookie.value.substring(0, 20)}${cookie.value.length > 20 ? '...' : ''}</td>
                    <td>${cookie.domain}</td>
                    <td>
                        <div class="table-actions">
                            <button class="button button-secondary" onclick="editCookie('${cookie.name}', '${cookie.domain}')">Edit</button>
                            <button class="button button-secondary" onclick="deleteCookie('${cookie.name}', '${cookie.domain}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Update domain management
            const domains = {};
            cookies.forEach(cookie => {
                domains[cookie.domain] = (domains[cookie.domain] || 0) + 1;
            });

            const domainList = document.getElementById('domainList');
            domainList.innerHTML = Object.entries(domains).map(([domain, count]) => `
                <div class="domain-item">
                    <div class="domain-info">
                        <span>${domain}</span>
                        <span>[${count} Cookies]</span>
                    </div>
                    <div class="table-actions">
                        <button class="button button-primary" onclick="viewDomainCookies('${domain}')">View Cookies</button>
                        <button class="button button-secondary" onclick="deleteDomainCookies('${domain}')">Delete All</button>
                    </div>
                </div>
            `).join('');
        });
    }

    // Load initial cookies
    loadCookies();

    // Search functionality
    const sessionSearch = document.querySelector('#sessions-tab .search-input');
    sessionSearch.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#sessionsTableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    const cookieSearch = document.querySelector('#cookies-tab .search-input');
    cookieSearch.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#cookiesTableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    // Navigation
    document.getElementById('settingsBtn').addEventListener('click', function() {
        window.location.href = 'settings.html';
    });

    // Help and Support buttons
    document.getElementById('helpBtn').addEventListener('click', function() {
        window.open('https://github.com/yourusername/cookie-manager/wiki', '_blank');
    });

    document.getElementById('supportBtn').addEventListener('click', function() {
        window.open('https://github.com/yourusername/cookie-manager/issues', '_blank');
    });

    // Profile button
    document.getElementById('profileBtn').addEventListener('click', function() {
        // Implement profile functionality
        console.log('Profile button clicked');
    });
});

// Global functions for session management
window.restoreSession = function(sessionDate) {
    chrome.storage.sync.get('sessions', function(data) {
        const session = data.sessions.find(s => s.date === sessionDate);
        if (session) {
            session.tabs.forEach(tab => {
                chrome.tabs.create({ url: tab.url });
            });
        }
    });
};

window.editSession = function(sessionDate) {
    // Implement session editing functionality
    console.log('Edit session:', sessionDate);
};

window.deleteSession = function(sessionDate) {
    if (confirm('Are you sure you want to delete this session?')) {
        chrome.storage.sync.get('sessions', function(data) {
            const sessions = data.sessions.filter(s => s.date !== sessionDate);
            chrome.storage.sync.set({ sessions: sessions }, function() {
                loadSessions();
            });
        });
    }
};

// Global functions for cookie management
window.editCookie = function(name, domain) {
    // Implement cookie editing functionality
    console.log('Edit cookie:', name, domain);
};

window.deleteCookie = function(name, domain) {
    if (confirm('Are you sure you want to delete this cookie?')) {
        chrome.cookies.remove({ name: name, domain: domain }, function() {
            loadCookies();
        });
    }
};

window.viewDomainCookies = function(domain) {
    const cookieSearch = document.querySelector('#cookies-tab .search-input');
    cookieSearch.value = domain;
    cookieSearch.dispatchEvent(new Event('input'));
    
    // Switch to cookies tab
    document.querySelector('[data-tab="cookies"]').click();
};

window.deleteDomainCookies = function(domain) {
    if (confirm(`Are you sure you want to delete all cookies for ${domain}?`)) {
        chrome.cookies.getAll({ domain: domain }, function(cookies) {
            const promises = cookies.map(cookie => 
                new Promise(resolve => 
                    chrome.cookies.remove({ name: cookie.name, domain: cookie.domain }, resolve)
                )
            );
            
            Promise.all(promises).then(() => {
                loadCookies();
            });
        });
    }
};

async function createNewSession(sessionName) {
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const sessionData = {
            name: sessionName,
            tabs: tabs.map(tab => ({
                id: tab.id,
                url: tab.url,
                title: tab.title
            }))
        };

        const result = await chrome.runtime.sendMessage({
            type: 'SAVE_SESSION',
            sessionData
        });

        if (result.success) {
            updateStatus('Session saved successfully');
            await refreshSessionList();
        } else {
            updateStatus(`Error: ${result.error}`);
        }
    } catch (error) {
        updateStatus(`Error: ${error.message}`);
    }
}

async function restoreSession(sessionId) {
    try {
        const result = await chrome.runtime.sendMessage({
            type: 'LOAD_SESSION',
            sessionId
        });

        if (result.success) {
            updateStatus(`Session restored successfully (${result.data.tabs.length} tabs)`);
        } else {
            updateStatus(`Error: ${result.error}`);
        }
    } catch (error) {
        updateStatus(`Error: ${error.message}`);
    }
}

async function deleteSession(sessionId) {
    if (!confirm('Are you sure you want to delete this session?')) {
        updateStatus('Session deletion cancelled');
        return;
    }

    try {
        const result = await chrome.runtime.sendMessage({
            type: 'DELETE_SESSION',
            sessionId
        });

        if (result.success) {
            updateStatus('Session deleted successfully');
            await refreshSessionList();
        } else {
            updateStatus(`Error: ${result.error}`);
        }
    } catch (error) {
        updateStatus(`Error: ${error.message}`);
    }
}

async function refreshSessionList() {
    try {
        const sessions = await chrome.storage.local.get(null);
        const sessionList = document.getElementById('session-list');
        sessionList.innerHTML = '';

        for (const [sessionId, sessionData] of Object.entries(sessions)) {
            const sessionElement = document.createElement('div');
            sessionElement.className = 'session-item';
            sessionElement.innerHTML = `
                <span>${sessionData.name} (${sessionData.tabs.length} tabs)</span>
                <div class="session-actions">
                    <button onclick="restoreSession('${sessionId}')">Restore</button>
                    <button onclick="deleteSession('${sessionId}')">Delete</button>
                </div>
            `;
            sessionList.appendChild(sessionElement);
        }
    } catch (error) {
        updateStatus(`Error refreshing session list: ${error.message}`);
    }
}

function updateStatus(message) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = 'status';
    setTimeout(() => {
        statusElement.textContent = '';
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await refreshSessionList();
    
    document.getElementById('save-session').addEventListener('click', () => {
        const sessionName = document.getElementById('session-name').value.trim();
        if (sessionName) {
            createNewSession(sessionName);
        } else {
            updateStatus('Please enter a session name');
        }
    });
});
