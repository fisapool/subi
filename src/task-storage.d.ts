export interface Task {
  id: string;
  title: string;
  completed: boolean;
  domain: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'done';
  createdAt: number;
}

export interface TaskData {
  title: string;
  domain: string;
  priority?: 'high' | 'medium' | 'low';
}

export function getAllTasks(): Promise<Record<string, Task>>;
export function saveTask(task: Task): Promise<Task>;
export function updateTask(task: Task): Promise<Task>;
export function deleteTask(taskId: string): Promise<Task | undefined>;
export function getTasksByStatus(completed: boolean): Promise<Record<string, Task>>;
export function searchTasks(query: string): Promise<Record<string, Task>>;
export function getTasks(): Promise<Task[]>;
export function saveTasks(tasks: Task[]): Promise<void>;
export function addTask(taskData: TaskData): Promise<Task>;
export function getTasksForDomain(domain: string): Promise<Task[]>;
export function markTaskAsDone(taskId: string): Promise<Task | undefined>; 