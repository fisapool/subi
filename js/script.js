// Task class to represent a task
class Task {
    constructor(title, domain, priority) {
        this.id = Date.now();
        this.title = title;
        this.domain = domain;
        this.priority = priority;
        this.completed = false;
        this.createdAt = new Date();
    }
}

// TaskManager class to handle task operations
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.taskForm = document.getElementById('taskForm');
        this.taskList = document.getElementById('taskList');
        
        this.initializeEventListeners();
        this.renderTasks();
    }

    initializeEventListeners() {
        this.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });
    }

    addTask() {
        const titleInput = document.getElementById('taskTitle');
        const domainInput = document.getElementById('taskDomain');
        const priorityInput = document.getElementById('taskPriority');

        const title = titleInput.value.trim();
        const domain = domainInput.value.trim();
        const priority = priorityInput.value;

        if (!title || !domain) {
            alert('Please fill in all fields');
            return;
        }

        const task = new Task(title, domain, priority);
        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.taskForm.reset();
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.renderTasks();
    }

    toggleTaskCompletion(taskId) {
        const task = this.tasks.find(task => task.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
        }
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    renderTasks() {
        this.taskList.innerHTML = '';
        
        this.tasks.sort((a, b) => {
            // Sort by priority (high > medium > low)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        this.tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            taskElement.innerHTML = `
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-domain">
                        ${task.domain}
                        <span class="task-priority priority-${task.priority}">${task.priority}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-complete" onclick="taskManager.toggleTaskCompletion(${task.id})">
                        ${task.completed ? 'Undo' : 'Complete'}
                    </button>
                    <button class="btn-delete" onclick="taskManager.deleteTask(${task.id})">Delete</button>
                </div>
            `;
            
            this.taskList.appendChild(taskElement);
        });
    }
}

// Initialize the task manager when the page loads
const taskManager = new TaskManager(); 