import { EventEmitter } from 'events'; // Create a singleton event emitter
class AppEventEmitter extends EventEmitter {
    private static instance: AppEventEmitter; private constructor() {
        super();
        // Increase max listeners to avoid memory leak warnings
        this.setMaxListeners(20);
    } public static getInstance(): AppEventEmitter {
        if (!AppEventEmitter.instance) {
            AppEventEmitter.instance = new AppEventEmitter();
        }
        return AppEventEmitter.instance;
    }
}// Export singleton instance
export const eventEmitter = AppEventEmitter.getInstance();