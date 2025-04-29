# FISABytes Cookie Manager

A powerful Chrome extension for managing browser cookies and sessions with enhanced security features.

## Features

- Session cookie monitoring and protection
- Focus mode for productivity
- Meeting mode for muting distracting tabs
- Cookie consent management
- Session activity logging

## Installation

### Development Mode

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the extension:
   ```
   npm run build
   ```
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder

### Production Mode

The extension is available on the Chrome Web Store (link coming soon).

## Development

- `npm run build` - Build the extension
- `npm run watch` - Build and watch for changes

## Project Structure

- `src/` - Source files
  - `background.js` - Background service worker
  - `content.js` - Content scripts
  - `popup.js` - Popup UI logic
  - `options.js` - Options page logic
- `dist/` - Built extension files
- `manifest.json` - Extension manifest

## License

MIT

## 🚀 Features

### Currently Implemented (Free Version)

#### Core Privacy Features
- **Session Cookie Protection**
  - Automatically detect and protect session cookies from being cleared
  - Manual import/export of cookies
  - Test feature to verify cookie protection
  - Support for multiple cookie formats (JSON, Netscape, CSV)

#### Productivity Features
- **Focus Mode**
  - Configure per-site actions (pin, mute, block notifications)
  - Manage focus settings via options page
  - Customize behavior for specific websites

- **Meeting Mode**
  - Automatically mute specified sites during meetings
  - Configure meeting-specific settings
  - Background muting for uninterrupted meetings

#### Additional Features
- **Activity Log**
  - Track extension and browsing activity
  - View and clear recent session logs
  - Basic activity monitoring

- **Custom Scripts (Basic)**
  - Add and manage custom scripts
  - Basic script execution support
  - Options page management

### Coming Soon (Premium Features)

- **Advanced Session Management**
  - Save and restore complete browser sessions
  - Include cookies and form data in sessions
  - Cloud sync across devices

- **Enhanced Productivity**
  - Session-aware task prioritization
  - Quick access popup controls
  - Advanced focus and meeting automation

- **Advanced Analytics**
  - Detailed activity filtering and search
  - Export and analyze browsing patterns
  - Custom reporting

- **Premium Script Management**
  - Full script synchronization
  - Popup-based script controls
  - Advanced automation features

## 💻 Installation

1. Download the extension from the Chrome Web Store (link coming soon)
2. Click "Add to Chrome" to install
3. Grant necessary permissions when prompted

## 📁 Project Structure

```
bytescookies/
├── .bin/                    # Binary files
├── node_modules/           # Dependencies
├── .babelrc               # Babel configuration
├── .gitignore             # Git ignore rules
├── .package-lock.json     # Package lock file
├── auth.js                # Authentication logic
├── background.js          # Extension background script
├── babel.config.js        # Babel configuration
├── content.js             # Content script
├── cookie-utils.js        # Cookie utility functions
├── index.html             # Main HTML file
├── manifest.json          # Extension manifest
├── options.css            # Options page styles
├── options.html           # Options page HTML
├── options.js             # Options page logic
├── package.json           # Project configuration
├── package-lock.json      # Package lock file
├── popup.css              # Popup styles
├── popup.html             # Popup HTML
├── popup.js               # Popup logic
├── popup_part2.css        # Additional popup styles
├── popup_part2.html       # Additional popup HTML
├── popup_part2.js         # Additional popup logic
├── premium.js             # Premium features
├── session-snippets.js    # Session management
├── sync.js                # Synchronization logic
├── task-storage.js        # Task storage
├── tasks.html             # Tasks page
├── utils.js               # Utility functions
├── CONTRIBUTING.md        # Contribution guidelines
├── ISSUES.md              # Issue reporting guide
├── LICENSE                # License file
└── README.md              # Project documentation
```

## 🌳 Free Version Features Tree

```
bytescookies (Free Version)
├── Core Privacy Features
│   ├── Session Cookie Protection
│   │   ├── Automatic Detection
│   │   ├── Manual Import/Export
│   │   └── Test Protection
│   │
│   └── Cookie Formats
│       └── JSON
│
├── Productivity Features
│   ├── Focus Mode
│   │   ├── Per-site Actions
│   │   │   ├── Pin Tabs
│   │   │   ├── Mute Notifications
│   │   │   └── Block Distractions
│   │   └── Options Page Management
│   │
│   └── Meeting Mode
│       ├── Site Muting
│       ├── Meeting Settings
│       └── Background Muting
│
├── Activity Log
│   ├── Extension Activity
│   ├── Browsing Activity
│   └── Session Logs
│
└── Custom Scripts (Basic)
    ├── Script Management
    ├── Basic Execution
    └── Options Page Controls
```

## 🌟 Premium Version Features Tree

```
bytescookies (Premium Version)
├── Advanced Session Management
│   ├── Complete Session Save/Restore
│   │   ├── Open Tabs
│   │   ├── Cookies
│   │   └── Form Data
│   ├── Cloud Sync
│   │   ├── Cross-Device Synchronization
│   │   ├── Automatic Backup
│   │   └── Version History
│   └── Session Snippets
│       ├── Named Sessions
│       ├── Scheduled Restore
│       └── Session Templates
│
├── Enhanced Productivity
│   ├── Session-Aware Task Prioritization
│   │   ├── Context-Based Highlighting
│   │   ├── Task Suggestions
│   │   └── Priority Overrides
│   ├── Quick Access Popup Controls
│   │   ├── Focus Mode Toggle
│   │   ├── Meeting Mode Toggle
│   │   └── Script Quick Actions
│   └── Advanced Automation
│       ├── Scheduled Actions
│       ├── Conditional Rules
│       └── Workflow Templates
│
├── Advanced Analytics
│   ├── Detailed Activity Filtering
│   │   ├── Date Ranges
│   │   ├── Site Categories
│   │   └── Custom Filters
│   ├── Activity Search
│   │   ├── Full-Text Search
│   │   ├── Tag-Based Search
│   │   └── Saved Searches
│   ├── Export & Analysis
│   │   ├── CSV/JSON Export
│   │   ├── Usage Patterns
│   │   └── Productivity Insights
│   └── Custom Reporting
│       ├── Report Templates
│       ├── Scheduled Reports
│       └── Share Reports
│
├── Premium Script Management
│   ├── Full Script Synchronization
│   │   ├── Cloud Backup
│   │   ├── Version Control
│   │   └── Conflict Resolution
│   ├── Popup-Based Script Controls
│   │   ├── Quick Enable/Disable
│   │   ├── Script Parameters
│   │   └── Execution History
│   └── Advanced Automation
│       ├── Script Scheduling
│       ├── Conditional Execution
│       └── Script Chaining
│
├── User Accounts & Collaboration
│   ├── User Authentication
│   │   ├── Email/Password
│   │   ├── OAuth Integration
│   │   └── Two-Factor Auth
│   ├── Team Features
│   │   ├── Shared Sessions
│   │   ├── Shared Scripts
│   │   └── Team Permissions
│   └── Collaboration Tools
│       ├── Comments & Notes
│       ├── Activity Feed
│       └── Team Notifications
│
└── Premium Support
    ├── Priority Help
    │   ├── Direct Email Support
    │   ├── Faster Response Times
    │   └── Feature Requests
    ├── Documentation
    │   ├── Advanced Guides
    │   ├── API Documentation
    │   └── Video Tutorials
    └── Community
        ├── Premium Forums
        ├── User Groups
        └── Early Access
```

## 🎯 Usage

### Session Cookie Protection

1. Click the BytesCookies icon in your browser toolbar
2. Use the "Test Protection" button to verify cookie protection
3. Import/export cookies as needed

### Focus Mode

1. Open BytesCookies options
2. Navigate to Focus Mode settings
3. Add websites and configure actions:
   - Pin tabs
   - Mute notifications
   - Block distractions

### Meeting Mode

1. Access Meeting Mode in options
2. Add websites to mute during meetings
3. Enable/disable as needed

### Activity Log

1. View logs in the options page
2. Enable/disable logging
3. Clear logs when needed

## 🌐 Browser Compatibility

- **Chrome**: Version 88+ (fully supported)
- **Edge**: Version 88+ (fully supported)
- **Firefox**: Version 78+ (limited support)
- **Safari**: Version 14+ (limited support)

## 🛠️ Development

### Prerequisites
- Node.js
- npm or yarn
- Chrome/Edge browser

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Load the extension in your browser

## 📝 License

BytesCookies is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 🐛 Reporting Issues

Found a bug? Please check our [Issues Guide](ISSUES.md) before reporting.

## 📞 Support

- **Documentation**: Check our [GitHub Wiki](https://github.com/fisapool/BytesCookies/wiki)
- **Issues**: [GitHub Issues](https://github.com/fisapool/BytesCookies/issues)
- **Email**: support@bytescookies.com

---

*Last updated: [Current Date]* 