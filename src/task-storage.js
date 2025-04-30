// Task Storage Module for BytesCookies
// Handles all task-related storage operations

import browser from 'webextension-polyfill';

// Task validation
function validateTask(task) {
  if (!task.id || !task.title || typeof task.completed !== 'boolean') {
    throw new Error('Invalid task structure');
  }
  if (task.title.length > 255) {
    throw new Error('Task title too long');
  }
  if (!/^\d+$/.test(task.id)) {
    throw new Error('Invalid task ID format');
  }
}

// Get all tasks
export async function getAllTasks() {
  try {
    const result = await browser.storage.local.get('tasks');
    return result.tasks || {};
  } catch (error) {
    throw new Error('Storage error');
  }
}

// Save a single task
export async function saveTask(task) {
  validateTask(task);
  const tasks = await getAllTasks();
  tasks[task.id] = task;
  await browser.storage.local.set({ tasks });
  return task;
}

// Update an existing task
export async function updateTask(task) {
  validateTask(task);
  const tasks = await getAllTasks();
  if (!tasks[task.id]) {
    throw new Error('Task not found');
  }
  tasks[task.id] = task;
  await browser.storage.local.set({ tasks });
  return task;
}

// Delete a task
export async function deleteTask(taskId) {
  const tasks = await getAllTasks();
  const { [taskId]: deletedTask, ...remainingTasks } = tasks;
  await browser.storage.local.set({ tasks: remainingTasks });
  return deletedTask;
}

// Get tasks by completion status
export async function getTasksByStatus(completed) {
  const tasks = await getAllTasks();
  return Object.fromEntries(
    Object.entries(tasks).filter(([_, task]) => task.completed === completed)
  );
}

// Search tasks by title
export async function searchTasks(query) {
  const tasks = await getAllTasks();
  const searchTerm = query.toLowerCase();
  return Object.fromEntries(
    Object.entries(tasks).filter(([_, task]) => 
      task.title.toLowerCase().includes(searchTerm)
    )
  );
}

// Task data structure
class Task {
  constructor(title, domain, priority = 'medium') {
    this.id = Date.now().toString();
    this.title = title;
    this.domain = domain;
    this.priority = priority;
    this.status = 'pending';
    this.createdAt = Date.now();
  }
}

// Get all tasks
export function getTasks() {
  return new Promise(resolve => {
    chrome.storage.local.get(['tasks'], (result) => {
      resolve(result.tasks || []);
    });
  });
}

// Save all tasks
export function saveTasks(tasks) {
  return new Promise(resolve => {
    chrome.storage.local.set({ tasks }, resolve);
  });
}

// Add a new task
export async function addTask(taskData) {
  const tasks = await getTasks();
  const newTask = new Task(taskData.title, taskData.domain, taskData.priority);
  tasks.push(newTask);
  await saveTasks(tasks);
  return newTask;
}

// Get tasks for a specific domain
export async function getTasksForDomain(domain) {
  const tasks = await getTasks();
  return tasks.filter(task => 
    task.domain === domain && 
    task.status === 'pending'
  ).sort((a, b) => {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// Mark a task as done
export async function markTaskAsDone(taskId) {
  const tasks = await getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.status = 'done';
    await updateTask(task);
  }
  return task;
} 