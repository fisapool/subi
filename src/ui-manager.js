import sessionManager from './session-manager';
import dataManager from './data-manager';


class UIManager {
  constructor() {
    this.signInForm = document.getElementById('signin-form');
    this.signUpForm = document.getElementById('signup-form');
    this.signInView = document.getElementById('signin-view');
    this.signUpView = document.getElementById('signup-view');
    this.signOutButton = document.getElementById('signout-button');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.generalError = document.getElementById('general-error');
    this.emailSignInError = document.getElementById('email-signin-error');
    this.passwordSignInError = document.getElementById('password-signin-error');
    this.emailSignUpError = document.getElementById('email-signup-error');
    this.passwordSignUpError = document.getElementById('password-signup-error');
    this.sessionsList = document.getElementById('sessions-list');
    this.allSessionsButton = document.getElementById('all-sessions-button');
    this.newSessionButton = document.getElementById('new-session-button');
    this.errorMap = {
      'auth/email-already-in-use': 'This email is already in use.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-disabled': 'This user account has been disabled.',
      'auth/user-not-found': 'User not found.',
      'auth/wrong-password': 'Incorrect password.',
    this.signInEmail = document.getElementById('signin-email');
    this.signInPassword = document.getElementById('signin-password');
    this.signUpEmail = document.getElementById('signup-email');
    this.signUpPassword = document.getElementById('signup-password');

    this.setupFormValidation();
    this.setupSessionsButtons();

  }

  displayError(element, message) {
    if(element === this.generalError){
        const errorMessage = this.errorMap[message]
        if(errorMessage){
            element.textContent = errorMessage;
        } else{
            element.textContent = message;
        }
    }
    else{
        element.textContent = message;
    element.textContent = message;
    element.style.display = 'block';
  }

  removeError(element) {
    element.textContent = '';
    element.style.display = 'none';
  }

  clearForm(form) {
    const inputs = form.querySelectorAll('input');
    inputs.forEach((input) => {
      input.value = '';
    });
  }

  showLoading() {
    this.loadingIndicator.style.display = 'block';
  }

  hideLoading() {
    this.loadingIndicator.style.display = 'none';
  }

  showSignOutButton() {
    this.signOutButton.style.display = 'block';
  }

  hideAllViews() {
    this.signInView.style.display = 'none';
    this.signUpView.style.display = 'none';
    this.signOutButton.style.display = 'none';
    this.sessionsList.style.display = 'none';
    this.removeError(this.generalError)
  }

  showSignInView() {
    this.hideAllViews();
    this.signInView.style.display = 'block';
  }
  showSessionsView() {
    this.hideAllViews();
    this.sessionsList.style.display = 'block';
  }

  showCreateSessionView(){
    
  }

  setupFormValidation() {
    this.signInEmail.addEventListener('input', () => {
      this.removeError(this.emailSignInError);
    });

    this.signInPassword.addEventListener('input', () => {
        this.removeError(this.passwordSignInError);
    });

    this.signUpEmail.addEventListener('input', () => {
        this.removeError(this.emailSignUpError);
    });

    this.signUpPassword.addEventListener('input', () => {
        this.removeError(this.passwordSignUpError);
    });
  }

  validateEmail(emailInput, errorElement) {
    if (!emailInput.value) {
      this.displayError(errorElement, 'Email is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value)) {
      this.displayError(errorElement, 'Invalid email format.');
      return false;
    }
    this.removeError(errorElement);
    return true;
  }

  validatePassword(passwordInput, errorElement) {
    if (!passwordInput.value) {
      this.displayError(errorElement, 'Password is required.');
      return false;
    }
    if (passwordInput.value.length < 6) {
      this.displayError(errorElement, 'Password must be at least 6 characters long.');
      return false;
    }
    this.removeError(errorElement);
    return true;
  }

  setupSessionsButtons() {
    this.allSessionsButton.addEventListener('click', () => {
      this.displayAllSessions();
    });
    this.newSessionButton.addEventListener('click', () => {
      this.showCreateSessionView();
    })
  }

  async displaySessions(sessions, allSessions) {
    this.showSessionsView();
    this.sessionsList.innerHTML = '';
  
    const userSessionsButton = document.createElement('button');
    userSessionsButton.textContent = 'My sessions';
    userSessionsButton.addEventListener('click', () => {
      this.displaySessions(sessions, false);
    });
    this.sessionsList.appendChild(userSessionsButton);
  
    const allSessionsButton = document.createElement('button');
    allSessionsButton.textContent = 'All sessions';
    allSessionsButton.addEventListener('click', () => {
      this.displaySessions(sessions, true);
    });
    this.sessionsList.appendChild(allSessionsButton);
  
    if(allSessions){
      sessions = await sessionManager.getAllSessions();
    }

    if(sessions.length === 0){
      const noSessions = document.createElement('p');
      noSessions.textContent = 'No sessions found';
      this.sessionsList.appendChild(noSessions);
      return;
    }
  
    sessions.forEach((session) => {
      const sessionItem = document.createElement('div');
      sessionItem.classList.add('session-item');
  
      const sessionName = document.createElement('h3');
      sessionName.textContent = session.name;
  
      const sessionUrl = document.createElement('p');
      sessionUrl.textContent = session.url;
  
      const applyButton = document.createElement('button');
      applyButton.textContent = 'Apply';
      applyButton.addEventListener('click', async () => {
        try {
          await sessionManager.applySession(session.userId, session.id);
        } catch (error) {
          this.displayError(this.generalError, error.message);
        }
      });
  
      const updateButton = document.createElement('button');
      updateButton.textContent = 'Update';
      updateButton.addEventListener('click', async () => {
        try {
          await sessionManager.updateSession(session.userId, session.id);
        } catch (error) {
          this.displayError(this.generalError, error.message);
        }
      });
  
      sessionItem.appendChild(sessionName);
      sessionItem.appendChild(sessionUrl);
      sessionItem.appendChild(applyButton);
      sessionItem.appendChild(updateButton);
      this.sessionsList.appendChild(sessionItem);
    });
  }
}

export default UIManager;