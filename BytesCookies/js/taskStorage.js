// Task Storage Module
const TaskStorage = {
  // Get all tasks
  async getAllTasks() {
    const result = await chrome.storage.sync.get('tasks');
    return result.tasks || [];
  },

  // Add a new task
  async addTask(task) {
    const tasks = await this.getAllTasks();
    const newTask = {
      id: Date.now().toString(),
      title: task.title,
      domain: task.domain,
      priority: task.priority,
      createdAt: new Date().toISOString(),
      completed: false
    };
    
    tasks.push(newTask);
    await chrome.storage.sync.set({ tasks });
    return newTask;
  },

  // Update a task
  async updateTask(taskId, updates) {
    const tasks = await this.getAllTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      await chrome.storage.sync.set({ tasks });
      return tasks[taskIndex];
    }
    return null;
  },

  // Delete a task
  async deleteTask(taskId) {
    const tasks = await this.getAllTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    await chrome.storage.sync.set({ tasks: filteredTasks });
  },

  // Get tasks by domain
  async getTasksByDomain(domain) {
    const tasks = await this.getAllTasks();
    return tasks.filter(task => task.domain === domain && !task.completed);
  },

  // Get high priority tasks
  async getHighPriorityTasks() {
    const tasks = await this.getAllTasks();
    return tasks.filter(task => task.priority === 'high' && !task.completed);
  },

  // Mark task as completed
  async completeTask(taskId) {
    return this.updateTask(taskId, { completed: true });
  }
};

// Export the module
export default TaskStorage; 