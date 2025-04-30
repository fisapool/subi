import firebaseAuthManager from './firebaseAuth.ts';

// DOM elements
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const logoutButton = document.getElementById('logoutButton');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const registerNameInput = document.getElementById('registerName');
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const loginErrorDiv = document.getElementById('loginError');
const registerErrorDiv = document.getElementById('registerError');
const authSection = document.getElementById('authSection');
const profileSection = document.getElementById('profileSection');
const userNameSpan = document.getElementById('userName');
const userEmailSpan = document.getElementById('userEmail');

function updateUIBasedOnAuth() {
  if (firebaseAuthManager.isAuthenticated()) {
    const user = firebaseAuthManager.getCurrentUser();
    if (user) {
      if (authSection) authSection.style.display = 'none';
      if (profileSection) profileSection.style.display = 'block';
      if (userNameSpan) userNameSpan.textContent = user.displayName || 'User';
      if (userEmailSpan) userEmailSpan.textContent = user.email || '';
    }
  } else {
    if (authSection) authSection.style.display = 'block';
    if (profileSection) profileSection.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateUIBasedOnAuth();

  if (loginButton) {
    loginButton.addEventListener('click', async () => {
      if (!loginEmailInput || !loginPasswordInput || !loginErrorDiv) return;
      loginErrorDiv.textContent = '';
      try {
        await firebaseAuthManager.login(loginEmailInput.value, loginPasswordInput.value);
        updateUIBasedOnAuth();
      } catch (error) {
        loginErrorDiv.textContent = error.message || 'Login failed';
      }
    });
  }

  if (registerButton) {
    registerButton.addEventListener('click', async () => {
      if (!registerEmailInput || !registerPasswordInput || !registerNameInput || !registerErrorDiv) return;
      registerErrorDiv.textContent = '';
      try {
        await firebaseAuthManager.register(registerEmailInput.value, registerPasswordInput.value);
        updateUIBasedOnAuth();
      } catch (error) {
        registerErrorDiv.textContent = error.message || 'Registration failed';
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await firebaseAuthManager.logout();
        updateUIBasedOnAuth();
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
  }
});
