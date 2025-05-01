// Categories management for Session Buddy with J2Cookies
export class CategoryManager {
    constructor() {
        this.defaultCategories = ['All Sessions', 'Recent', 'Favorites', 'Work', 'Personal'];
        this.customCategories = new Set();
    }

    // Initialize categories from storage
    async initialize() {
        try {
            const data = await chrome.storage.local.get('categories');
            if (data.categories) {
                this.customCategories = new Set(data.categories);
            }
            return true;
        } catch (error) {
            console.error('Error initializing categories:', error);
            return false;
        }
    }

    // Get all categories (default + custom)
    getAllCategories() {
        return [...this.defaultCategories, ...Array.from(this.customCategories)];
    }

    // Add a new custom category
    async addCategory(name) {
        try {
            if (this.defaultCategories.includes(name)) {
                throw new Error('Cannot add default category');
            }
            
            this.customCategories.add(name);
            await this.saveCategories();
            return { success: true, categories: this.getAllCategories() };
        } catch (error) {
            console.error('Error adding category:', error);
            return { success: false, error: error.message };
        }
    }

    // Remove a custom category
    async removeCategory(name) {
        try {
            if (this.defaultCategories.includes(name)) {
                throw new Error('Cannot remove default category');
            }

            this.customCategories.delete(name);
            await this.saveCategories();
            return { success: true, categories: this.getAllCategories() };
        } catch (error) {
            console.error('Error removing category:', error);
            return { success: false, error: error.message };
        }
    }

    // Save categories to storage
    async saveCategories() {
        try {
            await chrome.storage.local.set({
                categories: Array.from(this.customCategories)
            });
            return true;
        } catch (error) {
            console.error('Error saving categories:', error);
            return false;
        }
    }

    // Get sessions by category
    async getSessionsByCategory(category) {
        try {
            const data = await chrome.storage.local.get(null);
            const sessions = Object.entries(data)
                .filter(([key, value]) => value.tabs && value.category === category)
                .map(([id, session]) => ({ id, ...session }));

            if (category === 'Recent') {
                // Sort by date and get last 10
                return sessions
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 10);
            }

            return sessions;
        } catch (error) {
            console.error('Error getting sessions by category:', error);
            return [];
        }
    }

    // Update session category
    async updateSessionCategory(sessionId, category) {
        try {
            const data = await chrome.storage.local.get(sessionId);
            if (!data[sessionId]) {
                throw new Error('Session not found');
            }

            const session = data[sessionId];
            session.category = category;

            await chrome.storage.local.set({ [sessionId]: session });
            return { success: true, session };
        } catch (error) {
            console.error('Error updating session category:', error);
            return { success: false, error: error.message };
        }
    }

    // Search sessions across categories
    async searchSessions(query, filters = {}) {
        try {
            const data = await chrome.storage.local.get(null);
            let sessions = Object.entries(data)
                .filter(([key, value]) => value.tabs)
                .map(([id, session]) => ({ id, ...session }));

            // Apply search query
            if (query) {
                const searchTerm = query.toLowerCase();
                sessions = sessions.filter(session => 
                    session.name?.toLowerCase().includes(searchTerm) ||
                    session.category?.toLowerCase().includes(searchTerm) ||
                    session.tabs?.some(tab => 
                        tab.title?.toLowerCase().includes(searchTerm) ||
                        tab.url?.toLowerCase().includes(searchTerm)
                    )
                );
            }

            // Apply filters
            if (filters.category) {
                sessions = sessions.filter(session => 
                    session.category === filters.category
                );
            }

            if (filters.dateRange) {
                const { start, end } = filters.dateRange;
                sessions = sessions.filter(session =>
                    session.createdAt >= start && session.createdAt <= end
                );
            }

            if (filters.favorite) {
                sessions = sessions.filter(session => session.favorite);
            }

            return { success: true, sessions };
        } catch (error) {
            console.error('Error searching sessions:', error);
            return { success: false, error: error.message };
        }
    }
}
