# FISABytes Sessions

A powerful browser extension for managing sessions, tabs, and cookies across different browsers. This extension combines efficient session management with advanced cookie handling capabilities.

## Overview

FISABytes is a professional-grade browser extension that provides comprehensive session and cookie management tools. It allows users to save, restore, and transfer browser sessions while also managing cookies across different browsers or sessions.

## Features

- Session Management
  - Save and restore browser sessions
  - Tab management and organization
  - Cross-device session synchronization
  - Customizable settings
  - Keyboard shortcuts for quick actions

- Cookie Management
  - Export browser cookies to file
  - Import cookies from previously exported files
  - Cross-browser cookie management
  - Secure cookie handling
  - User-friendly popup interface

- General Features
  - Multi-language support (English, German, French, Russian, Vietnamese)
  - Offline functionality
  - Modern security practices
  - Comprehensive error handling

## Technical Stack

- TypeScript
- Chrome/Firefox Extension (Manifest V3)
- Service Worker for background operations
- Modern security practices
- Comprehensive error handling

## Test Coverage

The project maintains comprehensive test coverage across all major components:

### Core Components

- SessionManager: 100% coverage
  - Session operations
  - Tab management
  - State synchronization
- CookieManager: 100% coverage
  - Cookie operations
  - Error handling
  - State management
- StorageManager: 100% coverage
  - Storage operations
  - Data persistence
  - State synchronization

### Test Categories

- Unit Tests: Core functionality and individual components
- Integration Tests: Component interactions and workflows
- Security Tests: Validation and security measures
- Edge Cases: Error conditions and boundary scenarios

### Current Status

- Total Test Files: 5
- Passing Tests: 51/54
- Coverage: ~94%
- Remaining Issues: E2E tests require Puppeteer configuration

To run the tests:

```bash
npm test

# Run end-to-end tests
npm run test:e2e

# For coverage report
npm test -- --coverage
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the extension in your browser:
   - Chrome: Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## Development

The project structure is organized as follows:

```
FISABytes/
├── src/
│   ├── core/           # Core application logic
│   ├── utils/          # Utility functions
│   └── tests/          # Test files
├── assets/             # Static assets and icons
├── components/         # Reusable UI components
├── types/             # TypeScript type definitions
├── validation/        # Validation related code
├── security/          # Security related code
├── errors/            # Error handling
├── _locales/          # Internationalization files
├── manifest.json      # Extension manifest
├── popup.html         # Extension popup interface
├── settings.html      # Extension settings page
├── background.js      # Background service worker
├── content-script.js  # Content scripts
└── service-worker-loader.js
```

## Permissions

The extension requires the following permissions:

- `tabs`: For managing browser tabs
- `storage`: For storing extension data
- `cookies`: For cookie management
- `activeTab`: For accessing active tab data
- `scripting`: For executing scripts in tabs
- `alarms`: For scheduled tasks

## Security

FISABytes implements strict security measures:

- Content Security Policy (CSP)
- Secure cookie handling
- Protected storage mechanisms
- Input validation
- Secure session management

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
