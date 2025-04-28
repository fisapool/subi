// Form Data Management
function captureFormData() {
    const forms = Array.from(document.forms).map(form => {
        const data = {};
        for (let element of form.elements) {
            if (element.name && element.type !== 'submit' && element.type !== 'reset') {
                data[element.name] = element.value;
            }
        }
        return {
            action: form.action,
            method: form.method,
            data: data
        };
    });

    // Send forms data to background script
    chrome.runtime.sendMessage({
        type: 'SAVE_FORM_DATA',
        forms: forms,
        url: window.location.href
    });
}

async function restoreFormData() {
    const response = await chrome.runtime.sendMessage({
        type: 'GET_FORM_DATA',
        url: window.location.href
    });

    if (response && response.forms) {
        for (let form of document.forms) {
            const savedForm = response.forms.find(f => 
                f.action === form.action || 
                f.method === form.method
            );

            if (savedForm) {
                for (let name in savedForm.data) {
                    const element = form.elements[name];
                    if (element) {
                        element.value = savedForm.data[name];
                        // Trigger change event to ensure any listeners are notified
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }
        }
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_FORMS') {
        captureFormData();
        sendResponse({ success: true });
    } else if (message.type === 'RESTORE_FORMS') {
        restoreFormData();
        sendResponse({ success: true });
    }
    return true;
}); 