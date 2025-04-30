import browser from 'webextension-polyfill';

// Constants
const SYNC_INTERVAL = 30; // minutes
const API_BASE_URL = 'https://api.bytescookies.com';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms
const MAX_TITLE_LENGTH = 100;

// Authentication
export async function getAuthToken() {
  try {
    const token = await browser.identity.getAuthToken({ interactive: true });
    return token;
  } catch (error) {
    if (error.message.includes('timeout')) {
      throw new Error('Authentication timeout. Please try again.');
    }
    throw error;
  }
}

export async function clearAuthToken() {
  try {
    const token = await getAuthToken();
    await browser.identity.removeCachedAuthToken({ token });
  } catch (error) {
    throw error;
  }
}

// Data Validation
export function validateTaskData(task) {
  if (!task || typeof task !== 'object') return false;
  if (!task.id || typeof task.id !== 'string') return false;
  if (!task.title || typeof task.title !== 'string') return false;
  if (task.title.length > MAX_TITLE_LENGTH) return false;

  // Validate dates if present
  if (task.createdAt && !isValidDate(task.createdAt)) return false;
  if (task.updatedAt && !isValidDate(task.updatedAt)) return false;
  if (task.dueDate && !isValidDate(task.dueDate)) return false;

  // Validate optional fields
  if (task.priority && !['low', 'medium', 'high'].includes(task.priority)) return false;
  if (task.tags && !Array.isArray(task.tags)) return false;

  return true;
}

function isValidDate(date) {
  const timestamp = new Date(date).getTime();
  return !isNaN(timestamp);
}

export function sanitizeTaskData(task) {
  return {
    id: task.id,
    title: task.title.trim(),
    completed: Boolean(task.completed),
    updatedAt: task.updatedAt || Date.now(),
    version: task.version || 1,
    deleted: Boolean(task.deleted),
    priority: task.priority || 'medium',
    tags: Array.isArray(task.tags) ? task.tags : [],
    dueDate: task.dueDate || null,
  };
}

// Error handling utilities
async function handleNetworkError(error, retryCount = 0) {
  if (error.message.includes('timeout')) {
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return true; // Retry
    }
    throw new Error('Network timeout occurred. Please try again later.');
  }
  throw error;
}

async function handleRateLimiting(response) {
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || 60;
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return true; // Retry
  }
  return false;
}

// Sync Tasks
export async function syncTasksToServer() {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      const token = await getAuthToken();
      const { tasks } = await browser.storage.local.get('tasks');

      if (!Array.isArray(tasks)) {
        throw new Error('Invalid task format');
      }

      const validTasks = tasks.filter(validateTaskData).map(sanitizeTaskData);

      const response = await fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks: validTasks }),
      });

      if (await handleRateLimiting(response)) {
        retryCount++;
        continue;
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, refresh and retry
          await clearAuthToken();
          retryCount++;
          continue;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (await handleNetworkError(error, retryCount)) {
        retryCount++;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Maximum retry attempts reached');
}

export async function syncTasksFromServer() {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.tasks) {
      throw new Error('Invalid response');
    }

    const validTasks = data.tasks.filter(validateTaskData).map(sanitizeTaskData);
    await browser.storage.local.set({ tasks: validTasks });

    return validTasks;
  } catch (error) {
    if (error.message.includes('Network')) {
      throw new Error('Network error');
    }
    if (error.message.includes('Server')) {
      throw new Error('Server error');
    }
    if (error.message.includes('Invalid')) {
      throw new Error('Invalid response');
    }
    throw new Error('Sync failed: ' + error.message);
  }
}

export function resolveSyncConflict(localTasks, serverTasks) {
  const resolvedTasks = {};

  for (const taskId in { ...localTasks, ...serverTasks }) {
    const localTask = localTasks[taskId];
    const serverTask = serverTasks[taskId];

    if (!serverTask) {
      resolvedTasks[taskId] = localTask;
    } else if (!localTask) {
      resolvedTasks[taskId] = serverTask;
    } else if (serverTask.deleted) {
      resolvedTasks[taskId] = serverTask;
    } else if (localTask.deleted) {
      resolvedTasks[taskId] = localTask;
    } else {
      // Use version numbers for conflict resolution
      resolvedTasks[taskId] = localTask.version > serverTask.version ? localTask : serverTask;
    }
  }

  return resolvedTasks;
}

// Sync Scheduling
export async function scheduleSync() {
  await browser.alarms.create('sync', {
    periodInMinutes: SYNC_INTERVAL,
  });
}

export async function cancelSync() {
  await browser.alarms.clear('sync');
}

export async function initializeSync() {
  await scheduleSync();
  browser.alarms.onAlarm.addListener(async alarm => {
    if (alarm.name === 'sync') {
      try {
        await syncTasksToServer();
        await syncTasksFromServer();
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  });
}
