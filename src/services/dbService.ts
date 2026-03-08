import { Ingredient, ShoppingItem, Recipe, PlannedMeal } from '../types/pantry';

const DB_NAME = 'smartpantry';
const DB_VERSION = 4;

export const STORES = {
    INGREDIENTS: 'ingredients',
    SHOPPING: 'shopping',
    SAVED_RECIPES: 'saved_recipes',
    GENERATED_RECIPES: 'generated_recipes',
    MEAL_PLAN: 'meal_plan'
};

export function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
            const db = req.result;
            Object.values(STORES).forEach(store => {
                if (!db.objectStoreNames.contains(store)) {
                    db.createObjectStore(store, { keyPath: store === STORES.GENERATED_RECIPES ? 'timestamp' : 'id' });
                }
            });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function getAll<T>(storeName: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

export async function putData<T>(storeName: string, data: T): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(data);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function deleteData(storeName: string, id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
