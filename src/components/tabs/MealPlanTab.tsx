import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { usePantry } from '../../context/PantryContext';
import { MealType, PlannedMeal } from '../../types/pantry';

export const MealPlanTab = ({ t, setIsModalOpen }: { t: any, setIsModalOpen: any }) => {
    const { mealPlan, removePlannedMeal, savePlannedMeal, savedRecipes, generatedRecipes } = usePantry();

    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Måndag som start
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
    });
    const [showAddMealModal, setShowAddMealModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
    const [viewingMeal, setViewingMeal] = useState<PlannedMeal | null>(null);

    return (
        <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between">
        <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); }} className="p-2">
        <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold">
        {currentWeekStart.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} - {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
        </span>
        <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); }} className="p-2">
        <ChevronRight className="w-5 h-5" />
        </button>
        </div>

        <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(currentWeekStart);
            date.setDate(date.getDate() + i);
            date.setHours(12, 0, 0, 0);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const dayMeals = mealPlan.filter(m => m.date === dateStr);
            const dayName = date.toLocaleDateString('sv-SE', { weekday: 'long' });

            return (
                <div key={dateStr} className={clsx("border rounded-lg p-3", t.cardBg, t.cardBorder)}>
                <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                <span className="font-bold capitalize">{dayName}, {date.getDate()} {date.toLocaleDateString('sv-SE', { month: 'short' })}</span>
                {dayMeals.length > 0 && <span className="bg-purple-500/20 text-purple-600 text-xs px-2 py-0.5 rounded-full font-bold">{dayMeals.length}</span>}
                </div>
                <button onClick={() => { setSelectedDate(dateStr); setShowAddMealModal(true); setIsModalOpen(true); }} className="text-purple-600">
                <Plus className="w-5 h-5" />
                </button>
                </div>
                {dayMeals.length > 0 && (
                    <div className="space-y-2 mt-2">
                    {dayMeals.map(meal => (
                        <div key={meal.id} className={clsx("p-2 rounded border-l-4 text-gray-900 dark:text-gray-100 cursor-pointer hover:opacity-80 transition-opacity", meal.mealType === 'breakfast' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : meal.mealType === 'lunch' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : meal.mealType === 'dinner' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-pink-500 bg-pink-50 dark:bg-pink-900/20')} onClick={() => setViewingMeal(meal)}>
                        <div className="flex items-start justify-between">
                        <div className="flex-1">
                        <span className="text-[10px] uppercase font-bold opacity-60">{meal.mealType === 'breakfast' ? 'Frukost' : meal.mealType === 'lunch' ? 'Lunch' : meal.mealType === 'dinner' ? 'Middag' : 'Mellanmål'}</span>
                        <p className="font-bold text-sm">{meal.recipe.title}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removePlannedMeal(meal.id); }} className="text-red-500 p-1">
                        <X className="w-4 h-4" />
                        </button>
                        </div>
                        </div>
                    ))}
                    </div>
                )}
                </div>
            );
        })}
        </div>

        {showAddMealModal && selectedDate && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 pb-safe">
            <div className={clsx("w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto", t.cardBg, t.cardBorder)}>
            <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Lägg till måltid</h3>
            <button onClick={() => { setShowAddMealModal(false); setSelectedMealType(null); setIsModalOpen(false); }} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            {!selectedMealType ? (
                <div className="space-y-2">
                <button onClick={() => setSelectedMealType('breakfast')} className="w-full p-4 text-left rounded-xl border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">Frukost</button>
                <button onClick={() => setSelectedMealType('lunch')} className="w-full p-4 text-left rounded-xl border border-orange-500/50 bg-orange-50 dark:bg-orange-900/20">Lunch</button>
                <button onClick={() => setSelectedMealType('dinner')} className="w-full p-4 text-left rounded-xl border border-blue-500/50 bg-blue-50 dark:bg-blue-900/20">Middag</button>
                <button onClick={() => setSelectedMealType('snack')} className="w-full p-4 text-left rounded-xl border border-pink-500/50 bg-pink-50 dark:bg-pink-900/20">Mellanmål</button>
                </div>
            ) : (
                <div className="space-y-3">
                <div className="max-h-[60vh] overflow-y-auto space-y-3">
                {[...savedRecipes, ...generatedRecipes].map((recipe, idx) => (
                    <div key={idx} onClick={() => {
                        savePlannedMeal({ id: Date.now().toString() + Math.random(), date: selectedDate, mealType: selectedMealType, recipe: recipe, servings: recipe.servings || 4 });
                        setShowAddMealModal(false); setSelectedMealType(null); setIsModalOpen(false);
                    }} className={clsx("rounded-2xl overflow-hidden shadow-sm border cursor-pointer hover:shadow-md transition-shadow", t.cardBg, t.border)}>
                    {recipe.imageUrl ? (
                        <div className="relative h-32 overflow-hidden">
                        <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3 text-white">
                        <h3 className="font-bold text-base leading-tight">{recipe.title}</h3>
                        </div>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-3 text-white">
                        <h3 className="font-bold text-base leading-tight">{recipe.title}</h3>
                        </div>
                    )}
                    <div className="p-3">
                    <p className="text-xs opacity-70 line-clamp-2 mb-2">
                    {recipe.description || recipe.instructions.split('\n')[0].substring(0, 100) + '...'}
                    </p>
                    </div>
                    </div>
                ))}
                </div>
                </div>
            )}
            </div>
            </div>
        )}
        </div>
    );
};
