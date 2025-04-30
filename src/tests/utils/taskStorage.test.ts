import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAllTasks,
  saveTask,
  updateTask,
  deleteTask,
  getTasksByStatus,
  searchTasks,
  getTasks,
  saveTasks,
  addTask,
  getTasksForDomain,
  markTaskAsDone,
} from '../../task-storage';

// Mock browser.storage.local
const mockBrowser = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

// Mock chrome.storage.local
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

(global as any).browser = mockBrowser;
(global as any).chrome = mockChrome;

describe('Task Storage', () => {
  const mockTask = {
    id: '1234567890',
    title: 'Test Task',
    completed: false,
    domain: 'example.com',
    priority: 'medium',
    status: 'pending',
    createdAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBrowser.storage.local.get.mockImplementation((key) => Promise.resolve({ tasks: {} }));
    mockBrowser.storage.local.set.mockImplementation((data) => Promise.resolve());
    mockChrome.storage.local.get.mockImplementation((key, callback) => callback({ tasks: [] }));
    mockChrome.storage.local.set.mockImplementation((data, callback) => callback());
  });

  describe('Task Validation', () => {
    it('should throw error for invalid task structure', async () => {
      const invalidTask = { id: '123', title: 'Test' }; // missing completed
      await expect(saveTask(invalidTask)).rejects.toThrow('Invalid task structure');
    });

    it('should throw error for long task title', async () => {
      const longTitleTask = {
        ...mockTask,
        title: 'a'.repeat(256),
      };
      await expect(saveTask(longTitleTask)).rejects.toThrow('Task title too long');
    });

    it('should throw error for invalid task ID', async () => {
      const invalidIdTask = {
        ...mockTask,
        id: 'invalid-id',
      };
      await expect(saveTask(invalidIdTask)).rejects.toThrow('Invalid task ID format');
    });
  });

  describe('Task Operations', () => {
    it('should save a new task', async () => {
      mockBrowser.storage.local.get.mockImplementationOnce((key) =>
        Promise.resolve({ tasks: {} })
      );
      await saveTask(mockTask);
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        tasks: { [mockTask.id]: mockTask },
      });
    });

    it('should update an existing task', async () => {
      mockBrowser.storage.local.get.mockImplementationOnce((key) =>
        Promise.resolve({ tasks: { [mockTask.id]: mockTask } })
      );
      const updatedTask = { ...mockTask, title: 'Updated Task' };
      await updateTask(updatedTask);
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        tasks: { [mockTask.id]: updatedTask },
      });
    });

    it('should delete a task', async () => {
      mockBrowser.storage.local.get.mockImplementationOnce((key) =>
        Promise.resolve({ tasks: { [mockTask.id]: mockTask } })
      );
      await deleteTask(mockTask.id);
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({ tasks: {} });
    });

    it('should get tasks by completion status', async () => {
      const completedTask = { ...mockTask, completed: true };
      mockBrowser.storage.local.get.mockImplementationOnce((key) =>
        Promise.resolve({ tasks: { [mockTask.id]: mockTask, '2': completedTask } })
      );
      const completedTasks = await getTasksByStatus(true);
      expect(completedTasks).toEqual({ '2': completedTask });
    });

    it('should search tasks by title', async () => {
      const matchingTask = { ...mockTask, title: 'Search Test' };
      mockBrowser.storage.local.get.mockImplementationOnce((key) =>
        Promise.resolve({ tasks: { [mockTask.id]: mockTask, '2': matchingTask } })
      );
      const searchResults = await searchTasks('Search');
      expect(searchResults).toEqual({ '2': matchingTask });
    });
  });

  describe('Legacy Task Operations', () => {
    it('should get all tasks', async () => {
      const tasks = await getTasks();
      expect(tasks).toEqual([]);
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['tasks'], expect.any(Function));
    });

    it('should save all tasks', async () => {
      const tasks = [mockTask];
      await saveTasks(tasks);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ tasks }, expect.any(Function));
    });

    it('should add a new task', async () => {
      const taskData = {
        title: 'New Task',
        domain: 'example.com',
        priority: 'high',
      };
      const newTask = await addTask(taskData);
      expect(newTask).toMatchObject({
        title: taskData.title,
        domain: taskData.domain,
        priority: taskData.priority,
        status: 'pending',
      });
      expect(typeof newTask.id).toBe('string');
      expect(typeof newTask.createdAt).toBe('number');
    });

    it('should get tasks for a specific domain', async () => {
      const domainTask = { ...mockTask, domain: 'test.com' };
      mockChrome.storage.local.get.mockImplementationOnce((key, callback) =>
        callback({ tasks: [mockTask, domainTask] })
      );
      const domainTasks = await getTasksForDomain('test.com');
      expect(domainTasks).toEqual([domainTask]);
    });

    it('should mark a task as done', async () => {
      mockChrome.storage.local.get.mockImplementationOnce((key, callback) =>
        callback({ tasks: [mockTask] })
      );
      const updatedTask = await markTaskAsDone(mockTask.id);
      expect(updatedTask?.status).toBe('done');
    });
  });
}); 