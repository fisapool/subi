# BytesCookies Known Issues and Workarounds

This document tracks known issues, limitations, and workarounds for the BytesCookies browser extension. It's intended to help users understand current limitations and provide guidance on how to work around them.

## Cookie Management

### Cookie Import/Export

| Issue | Description | Workaround |
|-------|-------------|------------|
| **Import Format Limitations** | The extension only supports a specific JSON format for cookie imports. | Ensure your cookie export file follows the expected format: `[{"url": "https://example.com", "cookies": [{"name": "cookieName", "value": "cookieValue", ...}]}]` |
| **Partial Import Failures** | Some cookies may fail to import without clear indication of which ones. | Check the error details when an import fails. The extension now shows which specific cookies failed to import and why. |
| **Cross-Domain Cookie Import** | Importing cookies for domains you're not currently visiting may fail. | Import cookies while on the target domain, or use the domain input field to specify the target domain. |

### Session Cookie Protection

| Issue | Description | Workaround |
|-------|-------------|------------|
| **Protection Inconsistency** | Some session cookies may not be properly detected or protected. | Manually add important cookie names or domains to the protected list in the options page. |
| **Duration Inconsistency** | Session duration may be displayed in different units (minutes vs. hours). | The extension now consistently uses minutes for all duration settings. |

## Productivity Features

### Focus Mode

| Issue | Description | Workaround |
|-------|-------------|------------|
| **Domain Auto-Detection** | Focus mode may not automatically detect all relevant domains. | Manually add domains to the focus mode list in the options page. |
| **Permission Requirements** | Focus mode requires additional permissions that may not be granted. | Grant the requested permissions in the Security & Permissions tab of the options page. |

### Meeting Mode

| Issue | Description | Workaround |
|-------|-------------|------------|
| **Muted Sites Configuration** | Meeting mode may not mute all specified sites. | Ensure domain names are entered correctly in the options page, without 'http://' or 'https://' prefixes. |

## UI/UX Issues

| Issue | Description | Workaround |
|-------|-------------|------------|
| **Button State Reset** | Buttons may remain in a disabled state after operations complete. | Refresh the extension popup if a button appears stuck. |
| **Loading Indicator** | Some operations may not show a loading indicator. | The extension now includes a loading overlay for all major operations. |
| **Error Feedback** | Error messages may not provide enough detail. | Click "Show Details" in error messages to see more information about what went wrong. |

## Technical Limitations

| Issue | Description | Workaround |
|-------|-------------|------------|
| **Concurrent Operations** | Running multiple cookie operations simultaneously may cause issues. | The extension now prevents concurrent operations with a locking mechanism. |
| **Browser Compatibility** | Some features may not work in all browsers. | BytesCookies is primarily designed for Chrome and Edge. |
| **Storage Limitations** | The extension has limited storage for settings and logs. | Clear the activity log periodically if it becomes too large. |

## Reporting Issues

If you encounter an issue not listed here, please report it:

1. Check if the issue is already reported in our [GitHub Issues](https://github.com/fisapool/BytesCookies/issues)
2. If not, create a new issue with:
   - A clear description of the problem
   - Steps to reproduce
   - Expected vs. actual behavior
   - Browser version and extension version
   - Any relevant error messages

## Feature Requests

Have an idea for improving BytesCookies? We'd love to hear it!

1. Check our [Feature Requests](https://github.com/fisapool/BytesCookies/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement) to see if it's already been suggested
2. If not, create a new issue with the "enhancement" label and describe your idea

---

*Last updated: [Current Date]* 