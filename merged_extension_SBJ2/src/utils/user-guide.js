// User guide and education utilities for Session Buddy with J2Cookies
export class UserGuide {
    constructor() {
        this.guides = {
            sessionSharing: {
                title: 'Session Sharing Guide',
                sections: [
                    {
                        heading: 'What is Session Sharing?',
                        content: `Session sharing allows you to securely share your logged-in browser sessions with others. 
                        This includes all open tabs and their associated authentication cookies.`
                    },
                    {
                        heading: 'Security Considerations',
                        content: `• Shared sessions are encrypted for security
                        • Sessions automatically expire after 24 hours
                        • You can revoke access at any time
                        • Only share sessions with trusted recipients
                        • Be cautious when sharing sessions containing sensitive information`
                    },
                    {
                        heading: 'How to Share a Session',
                        content: `1. Select the session you want to share
                        2. Click the "Share Session" button
                        3. Copy the generated share token
                        4. Send the token to your recipient securely
                        5. Monitor access through the "Shared Sessions" tab`
                    },
                    {
                        heading: 'Managing Shared Sessions',
                        content: `• View all shared sessions in the "Shared Sessions" tab
                        • Monitor who accesses your shared sessions
                        • Revoke access to any shared session
                        • Receive notifications about session access and expiration`
                    }
                ]
            }
        };
    }

    // Get guide content
    getGuide(guideId) {
        return this.guides[guideId] || null;
    }

    // Get specific section from a guide
    getSection(guideId, sectionIndex) {
        const guide = this.getGuide(guideId);
        return guide?.sections[sectionIndex] || null;
    }

    // Get security tips
    getSecurityTips() {
        return [
            'Only share sessions with trusted recipients',
            'Revoke access when sharing is no longer needed',
            'Monitor access to your shared sessions',
            'Be cautious with sessions containing sensitive data',
            'Use secure channels to share session tokens'
        ];
    }

    // Get tooltip content for UI elements
    getTooltip(elementId) {
        const tooltips = {
            shareButton: 'Share this session securely with others. The session will expire after 24 hours.',
            revokeButton: 'Immediately revoke access to this shared session.',
            monitorButton: 'View access logs and manage shared sessions.',
            securitySettings: 'Configure security settings for session sharing.'
        };
        return tooltips[elementId] || '';
    }

    // Get error messages with user-friendly explanations
    getErrorMessage(errorCode) {
        const errorMessages = {
            'session-expired': {
                title: 'Session Expired',
                message: 'This shared session has expired. Please request a new shared session.',
                action: 'Contact the session owner for a new share token.'
            },
            'invalid-token': {
                title: 'Invalid Share Token',
                message: 'The share token is invalid or has been revoked.',
                action: 'Verify the token and try again, or request a new one.'
            },
            'cookie-restoration-failed': {
                title: 'Cookie Restoration Failed',
                message: 'Some cookies could not be restored. This may affect the session functionality.',
                action: 'Try accessing the shared session again or contact the session owner.'
            },
            'encryption-failed': {
                title: 'Encryption Failed',
                message: 'Failed to encrypt the session data securely.',
                action: 'Please try sharing the session again.'
            },
            'access-denied': {
                title: 'Access Denied',
                message: 'You do not have permission to access this shared session.',
                action: 'Contact the session owner for proper access rights.'
            }
        };
        return errorMessages[errorCode] || {
            title: 'Unknown Error',
            message: 'An unexpected error occurred.',
            action: 'Please try again or contact support.'
        };
    }

    // Get warning messages for potentially risky actions
    getWarningMessage(warningCode) {
        const warningMessages = {
            'sensitive-data': {
                title: 'Sensitive Data Warning',
                message: 'This session contains potentially sensitive data.',
                action: 'Please review the content before sharing.'
            },
            'multiple-access': {
                title: 'Multiple Access Warning',
                message: 'This session has been accessed multiple times.',
                action: 'Consider revoking access if this is unexpected.'
            },
            'expiring-soon': {
                title: 'Session Expiring Soon',
                message: 'This shared session will expire soon.',
                action: 'Create a new shared session if continued access is needed.'
            }
        };
        return warningMessages[warningCode] || {
            title: 'Warning',
            message: 'Please proceed with caution.',
            action: 'Review the action before continuing.'
        };
    }
}
