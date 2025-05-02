import { chrome } from 'webextension-polyfill';
import * as DataManager from './data-manager';

async function saveSession(userId, url, name) {
  try {
    const cookies = await chrome.cookies.getAll({ url });

    const sessionData = {
      url,
      name,
      cookies,
    };
    await DataManager.createSession(userId, sessionData.url, sessionData.name, sessionData.cookies);
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

async function updateSession(userId, sessionId) {
  try {
    const session = await DataManager.getSession(userId,sessionId);
    const cookies = await chrome.cookies.getAll({ url: session.url });

    const sessionData = {
      cookies,
    };
    await DataManager.updateSession(userId, sessionId, sessionData.cookies);
  } catch (error) {
    console.error('Error updating session:', error);
  }
}

async function loadSessions(userId) {
  try {
    return await DataManager.getSessions(userId);
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

async function applySession(userId, sessionId) {
  try {
    const session = await DataManager.getSession(userId,sessionId);
    const sessionUrl = session.url;

    const cookies = session.cookies;

    // Clear existing cookies for the domain
    const existingCookies = await chrome.cookies.getAll({ url: sessionUrl });
    for (const cookie of existingCookies) {
      await chrome.cookies.remove({
        url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
        name: cookie.name,
      });
    }

    // Set new cookies
    for (const cookie of cookies) {
      await chrome.cookies.set({
        url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: cookie.expirationDate,
      });
    }
    // Refresh the url
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.reload(tabs[0].id);
      });
  } catch (error) {
    console.error('Error applying session:', error);
  }
}

async function getAllSessions() {
  try {
    return await DataManager.getAllSessions();
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

async function createSessionInSessionsCollection(session) {
    return await DataManager.createSessionInSessionsCollection(session);
}

export { saveSession, updateSession, loadSessions, applySession, getAllSessions, createSessionInSessionsCollection};
