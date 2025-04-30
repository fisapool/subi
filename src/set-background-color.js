// Get theme from storage or system preference
function setBackgroundColor() {
    chrome.storage.local.get('theme', ({ theme }) => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (theme === 'dark' || (!theme && prefersDark)) {
            document.documentElement.style.backgroundColor = 'rgb(30, 30, 30)';
        } else {
            document.documentElement.style.backgroundColor = '';
        }
    });
}

// Set initial background color
setBackgroundColor();

// Listen for theme changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.theme) {
        setBackgroundColor();
    }
});
