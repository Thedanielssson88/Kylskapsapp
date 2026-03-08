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
        <div className="flex flex-col h-full pb-24">
        {/* Beautiful Food Header */}
        <div className="relative h-48 bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500 overflow-hidden flex-shrink-0">
        {/* Decorative food illustration */}
        <div className="absolute inset-0 opacity-20">
        <svg viewBox="0 0 200 200" className="w-full h-full">
        <circle cx="100" cy="100" r="80" fill="white" opacity="0.3"/>
        <path d="M100 40 Q120 60, 100 80 Q80 60, 100 40" fill="#4ade80" opacity="0.5"/>
        <circle cx="90" cy="70" r="8" fill="#f97316" opacity="0.6"/>
        <circle cx="110" cy="70" r="8" fill="#ef4444" opacity="0.6"/>
        <ellipse cx="100" cy="100" rx="25" ry="15" fill="#fbbf24" opacity="0.7"/>
        </svg>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-6">
        <h1 className="text-3xl font-black text-white drop-shadow-lg tracking-tight">Veckoplanering</h1>
        <p className="text-white/90 text-sm mt-1 font-medium">Planera dina måltider för veckan</p>
        </div>
        </div>

        {/* Week Navigation */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
        <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
        {currentWeekStart.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} - {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Vecka {Math.ceil((currentWeekStart.getTime() - new Date(currentWeekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}</p>
        </div>
        <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        <ChevronRight className="w-6 h-6" />
        </button>
        </div>

        {/* Days List */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
        <div className="p-4 space-y-4">
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

            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isSunday = date.getDay() === 0;

            return (
                <div key={dateStr} className={clsx("bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border-2 transition-all", isToday ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200 dark:border-gray-800")}>
                {/* Day Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                <span className={clsx("font-bold text-lg capitalize", isToday ? "text-blue-600 dark:text-blue-400" : isSunday ? "text-blue-500" : "text-gray-900 dark:text-gray-100")}>
                {dayName}, {date.getDate()} {date.toLocaleDateString('sv-SE', { month: 'short' })}
                </span>
                {dayMeals.length > 0 && (
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{dayMeals.length}</span>
                    </div>
                )}
                </div>
                <button onClick={() => { setSelectedDate(dateStr); setShowAddMealModal(true); setIsModalOpen(true); }} className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all active:scale-95 shadow-lg">
                <Plus className="w-6 h-6" />
                </button>
                </div>
                {/* Meals for this day */}
                {dayMeals.length > 0 ? (
                    <div className="p-4 space-y-3">
                    {dayMeals.map(meal => {
                        const mealColors = {
                            breakfast: { bg: 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20', border: 'border-l-yellow-500', text: 'text-yellow-700 dark:text-yellow-400', label: 'Frukost', icon: '🌅' },
                            lunch: { bg: 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20', border: 'border-l-orange-500', text: 'text-orange-700 dark:text-orange-400', label: 'Lunch', icon: '🍽️' },
                            dinner: { bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20', border: 'border-l-blue-600', text: 'text-blue-700 dark:text-blue-400', label: 'Middag', icon: '🌙' },
                            snack: { bg: 'bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20', border: 'border-l-pink-500', text: 'text-pink-700 dark:text-pink-400', label: 'Mellanmål', icon: '🍪' }
                        };
                        const color = mealColors[meal.mealType];

                        return (
                            <div key={meal.id} className={clsx("rounded-xl border-l-[6px] p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]", color.bg, color.border)} onClick={() => setViewingMeal(meal)}>
                            <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{color.icon}</span>
                            <span className={clsx("text-xs uppercase font-bold tracking-wide", color.text)}>{color.label}</span>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">{meal.recipe.title}</h3>
                            {meal.recipe.prepTime && (
                                <div className="flex items-center gap-1 mt-2 text-gray-600 dark:text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span className="text-xs">{meal.recipe.prepTime}</span>
                                </div>
                            )}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removePlannedMeal(meal.id); }} className="flex-shrink-0 p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 transition-colors">
                            <X className="w-5 h-5" />
                            </button>
                            </div>
                            </div>
                        );
                    })}
                    </div>
                ) : (
                    <div className="p-8 text-center">
                    <p className="text-gray-400 dark:text-gray-600 text-sm italic">Inga planerade måltider</p>
                    </div>
                )}
                </div>
            );
        })}
        </div>
        </div>

        {/* Modals */}
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
        )}
        </div>
        </div>
    );
};
