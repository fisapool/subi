/// <reference types="chrome"/>

export async function saveEnhancedCookies(url: string): Promise<chrome.cookies.Cookie[]> {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({ url }, (cookies) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      chrome.storage.local.set({ cookies }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(cookies);
        }
      });
    });
  });
}

export async function restoreEnhancedCookies(domain: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('cookies', (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const cookies = result.cookies || [];
      const domainCookies = cookies.filter((cookie: chrome.cookies.Cookie) => cookie.domain === domain);

      if (domainCookies.length === 0) {
        resolve();
        return;
      }

      Promise.all(domainCookies.map((cookie: chrome.cookies.Cookie) => 
        new Promise<void>((resolveCookie, rejectCookie) => {
          chrome.cookies.set({
            url: `https://${cookie.domain}${cookie.path}`,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expirationDate: cookie.expirationDate,
            storeId: cookie.storeId
          }, () => {
            if (chrome.runtime.lastError) {
              rejectCookie(new Error(chrome.runtime.lastError.message));
            } else {
              resolveCookie();
            }
          });
        })
      ))
        .then(() => resolve())
        .catch(reject);
    });
  });
}

export async function clearEnhancedCookies(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({ url }, (cookies) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (cookies.length === 0) {
        resolve();
        return;
      }

      Promise.all(cookies.map((cookie: chrome.cookies.Cookie) => 
        new Promise<void>((resolveCookie, rejectCookie) => {
          chrome.cookies.remove({
            url,
            name: cookie.name,
            storeId: cookie.storeId
          }, () => {
            if (chrome.runtime.lastError) {
              rejectCookie(new Error(chrome.runtime.lastError.message));
            } else {
              resolveCookie();
            }
          });
        })
      ))
        .then(() => resolve())
        .catch(reject);
    });
  });
} 