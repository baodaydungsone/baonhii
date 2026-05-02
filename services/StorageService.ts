
import localforage from 'localforage';

// Configure localforage
localforage.config({
    name: 'AIChatSimulator',
    storeName: 'app_data', // Should be alphanumeric and underscores
    description: 'Storage for characters, groups, and chat history'
});

export const StorageService = {
    /**
     * Save data to IndexedDB
     */
    async setItem<T>(key: string, value: T): Promise<T> {
        return await localforage.setItem(key, value);
    },

    /**
     * Get data from IndexedDB
     */
    async getItem<T>(key: string): Promise<T | null> {
        return await localforage.getItem<T>(key);
    },

    /**
     * Remove data from IndexedDB
     */
    async removeItem(key: string): Promise<void> {
        await localforage.removeItem(key);
    },

    /**
     * Clear all data in IndexedDB
     */
    async clear(): Promise<void> {
        await localforage.clear();
    },

    /**
     * Get all keys in IndexedDB
     */
    async keys(): Promise<string[]> {
        return await localforage.keys();
    }
};
