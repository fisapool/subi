# BytesCookies

A browser extension for managing cookies and sessions with advanced protection features.

## Features

- **Session Cookie Protection**: Automatically detect and protect session cookies from being cleared
- **Cookie Import/Export**: Save and restore your cookies across sessions
- **Test Protection**: Verify that your session cookies are being properly protected
- **Storage Management**: Monitor and manage your extension's storage usage

## Installation

1. Download the extension from the Chrome Web Store (link coming soon)
2. Click "Add to Chrome" to install the extension
3. Grant the necessary permissions when prompted

## Usage

### Session Cookie Protection

BytesCookies automatically detects and protects session cookies. These are cookies that:
- Have no expiration date
- Have the `session` flag set
- Are manually marked as session cookies in the options

To verify that your session cookies are being protected:
1. Click the BytesCookies icon in your browser toolbar
2. Click the "Test Protection" button
3. Review the results to see which cookies are protected

### Cookie Import/Export

#### Supported Formats

BytesCookies supports importing cookies in the following formats:

- **JSON**: Standard JSON format with cookie objects
  ```json
  {
    "cookies": [
      {
        "name": "sessionId",
        "value": "abc123",
        "domain": ".example.com"
      }
    ],
    "timestamp": 1625097600000,
    "version": "1.0"
  }
  ```

- **Netscape**: Traditional Netscape cookie file format
  ```
  # Netscape HTTP Cookie File
  # https://example.com/
  # This is a generated file!  Do not edit.
  
  .example.com	TRUE	/	FALSE	1625097600	sessionId	abc123
  ```

- **CSV**: Comma-separated values format
  ```
  domain,path,secure,expiry,name,value
  .example.com,/,TRUE,1625097600,sessionId,abc123
  ```

#### Exporting Cookies

1. Click the BytesCookies icon in your browser toolbar
2. Click the "Save Session Cookies" button
3. Your cookies will be saved to the extension's storage

#### Importing Cookies

1. Click the BytesCookies icon in your browser toolbar
2. Click the "Restore Session Cookies" button
3. Your previously saved cookies will be restored

### Storage Management

BytesCookies uses Chrome's storage API to save your cookies and settings. There are limits to how much data can be stored:

- **Local Storage**: Limited to approximately 5MB
- **Sync Storage**: Limited to approximately 100KB per item and 100 items total

To clear logs and free up storage:
1. Open the BytesCookies options page
2. Navigate to the "Storage" tab
3. Click the "Clear Logs" button

## Browser Compatibility

BytesCookies is designed to work with the following browsers:

- **Chrome**: Version 88 or higher (fully supported)
- **Edge**: Version 88 or higher (fully supported)
- **Firefox**: Version 78 or higher (limited support)
- **Safari**: Version 14 or higher (limited support)

Some features may be disabled in browsers with limited support.

## Troubleshooting

### Common Issues

- **"Failed to import cookies"**: Check that your import file is in one of the supported formats
- **"Session cookies not protected"**: Verify that the cookies have no expiration date or the session flag
- **"Storage limit reached"**: Clear logs or remove unused saved cookies

### Getting Help

If you encounter issues not covered in this documentation:

1. Check the [GitHub Issues](https://github.com/fisapool/BytesCookies/issues) page
2. Create a new issue with details about your problem
3. Include your browser version and any error messages

## Feedback

We welcome feedback to improve BytesCookies:

- **Feature Requests**: Submit via [GitHub Issues](https://github.com/fisapool/BytesCookies/issues)
- **Bug Reports**: Include steps to reproduce and expected vs. actual behavior
- **General Feedback**: Email us at feedback@bytescookies.com

## License

BytesCookies is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all contributors who have helped improve BytesCookies
- Special thanks to the open-source community for inspiration and tools

---

*Last updated: [28/04/2025]* 