import { AgentMessage } from './index'; // Din befintliga types-fil

export type LocalAgentMessage = AgentMessage & {
    sessionId?: string;
    imageUrls?: string[];
};

export type Ingredient = {
    id: string;
    name: string;
    source: 'scanned' | 'manual';
    location: string;
    category?: string;
    quantity?: string;
    expiry?: string;
};

export type ShoppingItem = {
    id: string;
    name: string;
    checked: boolean;
};

export type Recipe = {
    id?: string;
    title: string;
    description?: string;
    ingredients: string[];
    missingIngredients: string[];
    instructions: string;
    prepTime?: string;
    cookTime?: string;
    servings?: number;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    tags?: string[];
    imageUrl?: string;
};

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type PlannedMeal = {
    id: string;
    date: string;
    mealType: MealType;
    recipe: Recipe;
    servings: number;
    note?: string;
};
