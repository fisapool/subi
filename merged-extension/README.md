# Session Buddy with Sidepanels

A Chrome extension that combines Session Buddy functionality with sidepanel support.

## Features

- Save and manage browser sessions
- Access sessions through a convenient sidepanel
- Switch between welcome and main panels based on the current website
- Modern, clean UI with consistent styling

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `merged-extension` directory

## Testing

### Automated Tests

To run the automated tests:

1. Install dependencies:
   ```
   npm install
   ```

2. Run the tests:
   ```
   npm test
   ```

### Manual Tests

To run the manual tests:

1. Open the `manual-test.html` file in your browser
2. Follow the instructions on the page to test different aspects of the extension

## Testing in Chrome

To test the extension in Chrome:

1. Load the extension as described in the Installation section
2. Click the extension icon to open the popup
3. Open the sidepanel by clicking the sidepanel icon in the Chrome toolbar
4. Navigate to different websites to see the panel change automatically

## Files

- `manifest.json` - Extension configuration
- `background.js` - Background service worker
- `service-worker.js` - Sidepanel service worker
- `popup.html` and `popup.js` - Extension popup UI
- `sidepanels/` - Sidepanel HTML and JavaScript files
- `assets/` - Images and CSS files
- `_locales/` - Localization files

## Development

### Adding New Features

1. Modify the appropriate files in the extension
2. Update the tests to cover the new functionality
3. Test the changes in Chrome

### Debugging

To debug the extension:

1. Open Chrome DevTools
2. Go to the "Application" tab
3. Select "Service Workers" to debug the service worker
4. Select "Extensions" to debug the extension

## License

MIT 