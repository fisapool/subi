class PremiumManager {
  constructor() {
    this.premiumFeatures = {
      sessionSnippets: true,
      advancedActivityLog: true,
      customScripts: true,
      cloudSync: true,
      teamCollaboration: true,
    };
  }

  // Check if a specific feature is premium
  isPremiumFeature(featureName) {
    return this.premiumFeatures[featureName] || false;
  }

  // Check if user has premium access
  async hasPremiumAccess() {
    try {
      const user = await chrome.storage.local.get('currentUser');
      return user.currentUser?.premium || false;
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }

  // Show upgrade prompt for premium feature
  showUpgradePrompt(featureName) {
    const message = `Upgrade to Premium to access ${featureName}!`;
    chrome.runtime.sendMessage({
      type: 'showUpgradePrompt',
      message,
    });
  }

  // Gate a feature (check premium status and show prompt if needed)
  async gateFeature(featureName, callback) {
    if (!this.isPremiumFeature(featureName)) {
      return callback();
    }

    const hasPremium = await this.hasPremiumAccess();
    if (hasPremium) {
      return callback();
    }

    this.showUpgradePrompt(featureName);
  }

  // Update UI based on premium status
  async updateUI() {
    const hasPremium = await this.hasPremiumAccess();
    const premiumElements = document.querySelectorAll('[data-premium]');

    premiumElements.forEach(element => {
      const feature = element.dataset.premium;
      if (this.isPremiumFeature(feature)) {
        if (hasPremium) {
          element.classList.remove('premium-locked');
          element.classList.add('premium-unlocked');
        } else {
          element.classList.remove('premium-unlocked');
          element.classList.add('premium-locked');
        }
      }
    });
  }
}

// Export singleton instance
const premiumManager = new PremiumManager();
export default premiumManager;
