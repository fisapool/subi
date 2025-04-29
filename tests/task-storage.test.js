import { jest } from '@jest/globals';

// Mock the browser APIs
const mockBrowser = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue()
    }
  }
};

// Mock the module
const mockModule = {
  default: mockBrowser,
  __esModule: true,
};

jest.unstable_mockModule('webextension-polyfill', () => mockModule);

describe('Task Storage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Task Operations', () => {
    it('should save a new task', async () => {
      const mockTask = {
        id: '1',
        title: 'Test Task',
        completed: false,
        createdAt: new Date().toISOString()
      };

      const { saveTask } = await import('../src/task-storage.js');
      await saveTask(mockTask);

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        tasks: { [mockTask.id]: mockTask }
      });
    });

    it('should retrieve all tasks', async () => {
      const mockTasks = {
        '1': { id: '1', title: 'Task 1', completed: false },
        '2': { id: '2', title: 'Task 2', completed: true }
      };

      mockBrowser.storage.local.get.mockResolvedValue({ tasks: mockTasks });

      const { getAllTasks } = await import('../src/task-storage.js');
      const tasks = await getAllTasks();

      expect(tasks).toEqual(mockTasks);
      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith('tasks');
    });

    it('should update an existing task', async () => {
      const existingTask = {
        id: '1',
        title: 'Original Task',
        completed: false
      };

      const updatedTask = {
        ...existingTask,
        title: 'Updated Task',
        completed: true
      };

      mockBrowser.storage.local.get.mockResolvedValue({
        tasks: { [existingTask.id]: existingTask }
      });

      const { updateTask } = await import('../src/task-storage.js');
      await updateTask(updatedTask);

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        tasks: { [updatedTask.id]: updatedTask }
      });
    });

    it('should delete a task', async () => {
      const taskId = '1';
      const mockTasks = {
        [taskId]: { id: taskId, title: 'Task to Delete', completed: false },
        '2': { id: '2', title: 'Keep This Task', completed: false }
      };

      mockBrowser.storage.local.get.mockResolvedValue({ tasks: mockTasks });

      const { deleteTask } = await import('../src/task-storage.js');
      await deleteTask(taskId);

      const expectedTasks = { '2': mockTasks['2'] };
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        tasks: expectedTasks
      });
    });
  });

  describe('Task Validation', () => {
    it('should validate task structure before saving', async () => {
      const invalidTask = {
        // Missing required fields
        title: 'Invalid Task'
      };

      const { saveTask } = await import('../src/task-storage.js');
      await expect(saveTask(invalidTask)).rejects.toThrow();
    });

    it('should validate task ID format', async () => {
      const taskWithInvalidId = {
        id: 'invalid-id-format',
        title: 'Test Task',
        completed: false
      };

      const { saveTask } = await import('../src/task-storage.js');
      await expect(saveTask(taskWithInvalidId)).rejects.toThrow();
    });

    it('should validate task title length', async () => {
      const taskWithLongTitle = {
        id: '1',
        title: 'a'.repeat(256), // Exceeds maximum length
        completed: false
      };

      const { saveTask } = await import('../src/task-storage.js');
      await expect(saveTask(taskWithLongTitle)).rejects.toThrow();
    });
  });

  describe('Storage Operations', () => {
    it('should handle storage errors gracefully', async () => {
      mockBrowser.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const { getAllTasks } = await import('../src/task-storage.js');
      await expect(getAllTasks()).rejects.toThrow('Storage error');
    });

    it('should initialize empty storage if no tasks exist', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});

      const { getAllTasks } = await import('../src/task-storage.js');
      const tasks = await getAllTasks();

      expect(tasks).toEqual({});
    });

    it('should handle concurrent storage operations', async () => {
      const task1 = { id: '1', title: 'Task 1', completed: false };
      const task2 = { id: '2', title: 'Task 2', completed: false };

      mockBrowser.storage.local.get.mockResolvedValue({ tasks: {} });

      const { saveTask } = await import('../src/task-storage.js');
      await Promise.all([
        saveTask(task1),
        saveTask(task2)
      ]);

      expect(mockBrowser.storage.local.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('Task Queries', () => {
    it('should filter tasks by completion status', async () => {
      const mockTasks = {
        '1': { id: '1', title: 'Task 1', completed: false },
        '2': { id: '2', title: 'Task 2', completed: true },
        '3': { id: '3', title: 'Task 3', completed: false }
      };

      mockBrowser.storage.local.get.mockResolvedValue({ tasks: mockTasks });

      const { getTasksByStatus } = await import('../src/task-storage.js');
      const completedTasks = await getTasksByStatus(true);
      const incompleteTasks = await getTasksByStatus(false);

      expect(Object.keys(completedTasks)).toHaveLength(1);
      expect(Object.keys(incompleteTasks)).toHaveLength(2);
    });

    it('should search tasks by title', async () => {
      const mockTasks = {
        '1': { id: '1', title: 'Shopping List', completed: false },
        '2': { id: '2', title: 'Work Tasks', completed: false },
        '3': { id: '3', title: 'Shopping Budget', completed: false }
      };

      mockBrowser.storage.local.get.mockResolvedValue({ tasks: mockTasks });

      const { searchTasks } = await import('../src/task-storage.js');
      const searchResults = await searchTasks('shopping');

      expect(Object.keys(searchResults)).toHaveLength(2);
      expect(searchResults['1'].title).toContain('Shopping');
      expect(searchResults['3'].title).toContain('Shopping');
    });
  });
}); 