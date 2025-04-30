document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotPasswordLink = document.getElementById('forgot-password');
    const backToLoginBtn = document.getElementById('back-to-login');

    // Tab switching functionality
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update active tab
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding form
            authForms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${targetTab}-form`) {
                    form.classList.add('active');
                }
            });
        });
    });

    // Forgot password functionality
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.remove('active');
        forgotPasswordForm.classList.add('active');
    });

    backToLoginBtn.addEventListener('click', () => {
        forgotPasswordForm.classList.remove('active');
        loginForm.classList.add('active');
    });

    // Form validation and submission
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const resetPasswordButton = document.getElementById('reset-password-button');

    // Login form submission
    loginButton.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        if (!validateEmail(email)) {
            showError('login-email', 'Please enter a valid email address');
            return;
        }

        if (!password) {
            showError('login-password', 'Please enter your password');
            return;
        }

        try {
            // TODO: Implement actual authentication logic
            const response = await authenticateUser(email, password, rememberMe);
            if (response.success) {
                // Redirect to main application
                window.location.href = 'popup.html';
            } else {
                showError('login-form', response.message);
            }
        } catch (error) {
            showError('login-form', 'An error occurred during login');
        }
    });

    // Registration form submission
    registerButton.addEventListener('click', async () => {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const termsAgreed = document.getElementById('terms-agreement').checked;

        if (!validateEmail(email)) {
            showError('register-email', 'Please enter a valid email address');
            return;
        }

        if (password.length < 8) {
            showError('register-password', 'Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            showError('register-confirm-password', 'Passwords do not match');
            return;
        }

        if (!termsAgreed) {
            showError('terms-agreement', 'Please agree to the terms and conditions');
            return;
        }

        try {
            // TODO: Implement actual registration logic
            const response = await registerUser(email, password);
            if (response.success) {
                // Redirect to main application
                window.location.href = 'popup.html';
            } else {
                showError('register-form', response.message);
            }
        } catch (error) {
            showError('register-form', 'An error occurred during registration');
        }
    });

    // Password reset form submission
    resetPasswordButton.addEventListener('click', async () => {
        const email = document.getElementById('reset-email').value;

        if (!validateEmail(email)) {
            showError('reset-email', 'Please enter a valid email address');
            return;
        }

        try {
            // TODO: Implement actual password reset logic
            const response = await resetPassword(email);
            if (response.success) {
                showSuccess('reset-email', 'Password reset instructions sent to your email');
            } else {
                showError('reset-email', response.message);
            }
        } catch (error) {
            showError('reset-email', 'An error occurred while processing your request');
        }
    });

    // Helper functions
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.classList.add('error');
        
        let errorMessage = element.querySelector('.error-message');
        if (!errorMessage) {
            errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            element.appendChild(errorMessage);
        }
        errorMessage.textContent = message;
    }

    function showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        element.classList.add('success');
        
        let successMessage = element.querySelector('.success-message');
        if (!successMessage) {
            successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            element.appendChild(successMessage);
        }
        successMessage.textContent = message;
    }

    // Mock authentication functions (to be replaced with actual implementation)
    async function authenticateUser(email, password, rememberMe) {
        // TODO: Implement actual authentication
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 1000);
        });
    }

    async function registerUser(email, password) {
        // TODO: Implement actual registration
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 1000);
        });
    }

    async function resetPassword(email) {
        // TODO: Implement actual password reset
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 1000);
        });
    }
}); 