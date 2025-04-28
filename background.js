// Tab Management
async function captureTabs() {
    const tabs = await chrome.tabs.query({});
    const sessionTabs = tabs.map(tab => ({
        url: tab.url,
        title: tab.title,
        active: tab.active,
        pinned: tab.pinned
    }));
    await chrome.storage.local.set({ sessionTabs });
    return sessionTabs;
}

async function restoreTabs() {
    const { sessionTabs } = await chrome.storage.local.get('sessionTabs');
    if (sessionTabs) {
        for (let tab of sessionTabs) {
            await chrome.tabs.create({ 
                url: tab.url,
                active: tab.active,
                pinned: tab.pinned
            });
        }
    }
}

// Cookie Management
async function captureCookies() {
    const { sessionTabs } = await chrome.storage.local.get('sessionTabs');
    const cookies = [];
    
    for (let tab of sessionTabs) {
        try {
            const url = new URL(tab.url);
            const domainCookies = await chrome.cookies.getAll({ domain: url.hostname });
            cookies.push(...domainCookies);
        } catch (error) {
            console.error(`Error capturing cookies for ${tab.url}:`, error);
        }
    }
    
    await chrome.storage.local.set({ cookies });
    return cookies;
}

async function restoreCookies() {
    const { cookies } = await chrome.storage.local.get('cookies');
    if (cookies) {
        for (let cookie of cookies) {
            try {
                await chrome.cookies.set({
                    url: `https://${cookie.domain}`,
                    name: cookie.name,
                    value: cookie.value,
                    path: cookie.path,
                    expirationDate: cookie.expirationDate,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    sameSite: cookie.sameSite
                });
            } catch (error) {
                console.error(`Error restoring cookie ${cookie.name}:`, error);
            }
        }
    }
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'CAPTURE_SESSION':
            (async () => {
                await captureTabs();
                await captureCookies();
                sendResponse({ success: true });
            })();
            break;
            
        case 'RESTORE_SESSION':
            (async () => {
                await restoreCookies();
                await restoreTabs();
                sendResponse({ success: true });
            })();
            break;
    }
    return true; // Keep the message channel open for async responses
}); 