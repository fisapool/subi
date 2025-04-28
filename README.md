# Session Buddy Chrome Extension

Session Buddy is a powerful Chrome extension that allows you to save, organize, and recall your browser tabs and sessions. It helps you manage your browsing sessions efficiently by saving the state of your tabs and cookies, allowing you to restore them later.

## Features

- **Save Sessions**: Save your current browsing session with all open tabs
- **Organize Sessions**: Name and categorize your saved sessions
- **Restore Sessions**: Quickly restore any saved session with a single click
- **Cookie Management**: Automatically saves and restores cookies for each domain
- **Warning System**: Identifies potential issues with cookies and provides warnings
- **User-Friendly Interface**: Clean and intuitive UI for managing sessions

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/fisapool/subi.git
   ```

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
   - Click "Load unpacked" and select the `dist` directory from this repository

## Usage

1. Click the Session Buddy icon in your Chrome toolbar to open the popup
2. Click "New Session" to save your current browsing session
3. Give your session a name and click "Save"
4. To restore a session, click on it in the list and click "Restore"

## Development

- `npm run dev`: Start the development server
- `npm run build`: Build the extension for production
- `npm run test`: Run tests

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 