# FISABytes Sessions Chrome Extension

A Chrome extension for managing browser sessions and tabs efficiently. This extension allows users to save, manage, and restore browser sessions with ease.

## Features

- Save and restore browser sessions
- Tab management
- Session organization
- Cross-device session synchronization
- Customizable settings
- Keyboard shortcuts for quick actions

## Installation

1. Clone this repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
npm install
```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension directory

## Development

### Project Structure

- `background.js` - Background service worker for extension
- `content-script.js` - Content scripts injected into web pages
- `popup.html` & `popup.js` - Extension popup interface
- `settings.html` & `settings.js` - Extension settings page
- `assets/` - Contains icons and other static assets
- `_locales/` - Internationalization files
- `components/` - Reusable UI components

### Testing

The project uses Jest and Puppeteer for testing:

```bash
# Run unit tests
npm test

# Run end-to-end tests
npm run test:e2e
```

## Building

The extension uses modern JavaScript and is configured with Babel for compatibility. The build process is handled through the package.json scripts.

## Permissions

The extension requires the following permissions:
- `tabs` - For managing browser tabs
- `storage` - For saving session data
- `alarms` - For scheduled tasks
- `cookies` - For session management
- `activeTab` - For current tab operations
- `webNavigation` - For tracking navigation events

## Security

The extension implements a strict Content Security Policy (CSP) to ensure secure operation. All external resources are properly vetted and the extension follows Chrome's security best practices.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your license information here]

## Support

For support, please [add your support contact information here] 