export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
  deleted: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  dueDate: number | null;
}

export function getAuthToken(): Promise<string>;
export function clearAuthToken(): Promise<void>;
export function validateTaskData(task: any): boolean;
export function sanitizeTaskData(task: any): Task;
export function syncTasksToServer(): Promise<any>;
export function syncTasksFromServer(): Promise<Task[]>;
export function resolveSyncConflict(localTasks: Record<string, Task>, serverTasks: Record<string, Task>): Record<string, Task>;
export function scheduleSync(): Promise<void>;
export function cancelSync(): Promise<void>;
export function initializeSync(): Promise<void>; 