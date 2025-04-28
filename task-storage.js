// Task Storage Module for BytesCookies
// Handles all task-related storage operations

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

// Update an existing task
export async function updateTask(updatedTask) {
  let tasks = await getTasks();
  tasks = tasks.map(task => task.id === updatedTask.id ? updatedTask : task);
  await saveTasks(tasks);
  return updatedTask;
}

// Delete a task
export async function deleteTask(taskId) {
  let tasks = await getTasks();
  tasks = tasks.filter(task => task.id !== taskId);
  await saveTasks(tasks);
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