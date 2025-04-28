import TaskStorage from './taskStorage.js';

// Task Manager Module
const TaskManager = {
  // Initialize task manager
  async init() {
    this.taskForm = document.getElementById('taskForm');
    this.taskList = document.getElementById('taskList');
    
    // Add event listeners
    this.taskForm.addEventListener('submit', this.handleTaskSubmit.bind(this));
    
    // Load initial tasks
    await this.loadTasks();
  },

  // Handle task form submission
  async handleTaskSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(this.taskForm);
    const task = {
      title: formData.get('taskTitle'),
      domain: formData.get('taskDomain'),
      priority: formData.get('taskPriority')
    };

    await TaskStorage.addTask(task);
    await this.loadTasks();
    this.taskForm.reset();
  },

  // Load and display tasks
  async loadTasks() {
    const tasks = await TaskStorage.getAllTasks();
    this.renderTasks(tasks);
  },

  // Render tasks in the UI
  renderTasks(tasks) {
    this.taskList.innerHTML = '';
    
    tasks.forEach(task => {
      const taskElement = this.createTaskElement(task);
      this.taskList.appendChild(taskElement);
    });
  },

  // Create task element
  createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item priority-${task.priority}`;
    taskElement.dataset.taskId = task.id;
    
    taskElement.innerHTML = `
      <div class="task-content">
        <h3>${task.title}</h3>
        <p>Domain: ${task.domain}</p>
        <p>Priority: ${task.priority}</p>
        <p>Created: ${new Date(task.createdAt).toLocaleDateString()}</p>
      </div>
      <div class="task-actions">
        <button class="complete-btn" title="Mark as completed">✓</button>
        <button class="delete-btn" title="Delete task">×</button>
      </div>
    `;

    // Add event listeners
    const completeBtn = taskElement.querySelector('.complete-btn');
    const deleteBtn = taskElement.querySelector('.delete-btn');

    completeBtn.addEventListener('click', () => this.handleTaskComplete(task.id));
    deleteBtn.addEventListener('click', () => this.handleTaskDelete(task.id));

    return taskElement;
  },

  // Handle task completion
  async handleTaskComplete(taskId) {
    await TaskStorage.completeTask(taskId);
    await this.loadTasks();
  },

  // Handle task deletion
  async handleTaskDelete(taskId) {
    await TaskStorage.deleteTask(taskId);
    await this.loadTasks();
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  TaskManager.init();
});

export default TaskManager; 