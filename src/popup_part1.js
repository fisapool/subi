window.cookieUtils = {
  exportCookies: async function(tab) {
    if (!tab || !tab.url) {
      throw new Error('Invalid tab or URL');
    }
    const url = new URL(tab.url);
    return new Promise((resolve, reject) => {
      chrome.cookies.getAll({ domain: url.hostname }, (cookies) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(cookies);
      });
    });
  },

  importCookies: async function(cookies, tab) {
    if (!Array.isArray(cookies)) {
      throw new Error('Cookies must be an array');
    }
    if (!tab || !tab.url) {
      throw new Error('Invalid tab or URL');
    }
    let imported = 0;
    let failed = 0;

    const url = new URL(tab.url);
    const setCookiePromises = cookies.map(cookie => {
      return new Promise((resolve) => {
        const domain = cookie.domain ? cookie.domain.replace(/^\./, '') : url.hostname;
        const cookieDetails = {
          url: url.protocol + '//' + domain,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expirationDate: cookie.expirationDate
        };
        chrome.cookies.set(cookieDetails, (result) => {
          if (chrome.runtime.lastError || !result) {
            failed++;
          } else {
            imported++;
          }
          resolve();
        });
      });
    });

    await Promise.all(setCookiePromises);
    return { imported, failed };
  }
};
