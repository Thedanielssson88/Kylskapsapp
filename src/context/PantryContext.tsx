import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Ingredient, ShoppingItem, Recipe, PlannedMeal } from '../types/pantry';
import { getAll, putData, deleteData, STORES } from '../services/dbService';

type PantryContextType = {
    ingredients: Ingredient[];
    shoppingList: ShoppingItem[];
    savedRecipes: Recipe[];
    generatedRecipes: Recipe[];
    mealPlan: PlannedMeal[];
    setGeneratedRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
    saveIngredient: (ing: Ingredient) => Promise<void>;
    removeIngredient: (id: string) => Promise<void>;
    saveShoppingItem: (item: ShoppingItem) => Promise<void>;
    removeShoppingItem: (id: string) => Promise<void>;
    toggleSavedRecipe: (recipe: Recipe) => Promise<void>;
    savePlannedMeal: (meal: PlannedMeal) => Promise<void>;
    removePlannedMeal: (id: string) => Promise<void>;
    isWorking: boolean;
    setIsWorking: (val: boolean) => void;
    loadingMessage: string;
    setLoadingMessage: (msg: string) => void;
};

const PantryContext = createContext<PantryContextType | undefined>(undefined);

export const PantryProvider = ({ children }: { children: ReactNode }) => {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
    const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);

    const [isWorking, setIsWorking] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    useEffect(() => {
        async function load() {
            setIngredients(await getAll<Ingredient>(STORES.INGREDIENTS));
            setShoppingList(await getAll<ShoppingItem>(STORES.SHOPPING));
            setSavedRecipes(await getAll<Recipe>(STORES.SAVED_RECIPES));
            setMealPlan(await getAll<PlannedMeal>(STORES.MEAL_PLAN));

            const genRec = await getAll<{timestamp: number, recipes: Recipe[]}>(STORES.GENERATED_RECIPES);
            if (genRec.length > 0) {
                const latest = genRec.sort((a, b) => b.timestamp - a.timestamp)[0];
                setGeneratedRecipes(latest.recipes || []);
            }
        }
        load();
    }, []);

    const saveIngredient = async (ing: Ingredient) => {
        await putData(STORES.INGREDIENTS, ing);
        setIngredients(prev => {
            const exists = prev.findIndex(i => i.id === ing.id);
            if (exists >= 0) { const n = [...prev]; n[exists] = ing; return n; }
            return [...prev, ing];
        });
    };

    const removeIngredient = async (id: string) => {
        await deleteData(STORES.INGREDIENTS, id);
        setIngredients(prev => prev.filter(i => i.id !== id));
    };

    const saveShoppingItem = async (item: ShoppingItem) => {
        await putData(STORES.SHOPPING, item);
        setShoppingList(prev => {
            const exists = prev.findIndex(i => i.id === item.id);
            if (exists >= 0) { const n = [...prev]; n[exists] = item; return n; }
            return [...prev, item];
        });
    };

    const removeShoppingItem = async (id: string) => {
        await deleteData(STORES.SHOPPING, id);
        setShoppingList(prev => prev.filter(i => i.id !== id));
    };

    const toggleSavedRecipe = async (recipe: Recipe) => {
        const existing = savedRecipes.find(r => r.title === recipe.title);
        if (existing) {
            await deleteData(STORES.SAVED_RECIPES, existing.id!);
            setSavedRecipes(prev => prev.filter(r => r.title !== recipe.title));
        } else {
            const toSave = { ...recipe, id: Date.now().toString() };
            await putData(STORES.SAVED_RECIPES, toSave);
            setSavedRecipes(prev => [...prev, toSave]);
        }
    };

    const savePlannedMeal = async (meal: PlannedMeal) => {
        await putData(STORES.MEAL_PLAN, meal);
        setMealPlan(prev => {
            const exists = prev.findIndex(m => m.id === meal.id);
            if (exists >= 0) { const n = [...prev]; n[exists] = meal; return n; }
            return [...prev, meal];
        });
    };

    const removePlannedMeal = async (id: string) => {
        await deleteData(STORES.MEAL_PLAN, id);
        setMealPlan(prev => prev.filter(m => m.id !== id));
    };

    return (
        <PantryContext.Provider value={{
            ingredients, shoppingList, savedRecipes, generatedRecipes, mealPlan, setGeneratedRecipes,
            saveIngredient, removeIngredient, saveShoppingItem, removeShoppingItem, toggleSavedRecipe, savePlannedMeal, removePlannedMeal,
            isWorking, setIsWorking, loadingMessage, setLoadingMessage
        }}>
        {children}
        </PantryContext.Provider>
    );
};

export const usePantry = () => {
    const context = useContext(PantryContext);
    if (!context) throw new Error("usePantry must be used within PantryProvider");
    return context;
};
