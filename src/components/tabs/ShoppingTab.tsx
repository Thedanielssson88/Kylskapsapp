import React, { useState, useMemo } from 'react';
import { Plus, Check, X, CheckCircle2, ClipboardCheck, ChevronLeft, ChevronRight, Sun, Moon, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { usePantry } from '../../context/PantryContext';

export const ShoppingTab = ({ t, setIsModalOpen, darkMode, setDarkMode, navigate }: { t: any, setIsModalOpen: any, darkMode: boolean, setDarkMode: (val: boolean) => void, navigate: any }) => {
    const { shoppingList, mealPlan, ingredients, saveShoppingItem, removeShoppingItem, saveIngredient } = usePantry();
    const [manualShopping, setManualShopping] = useState('');

    // States för Inventeringsdialogen
    const [showInventoryDialog, setShowInventoryDialog] = useState(false);
    const [inventoryWeekIndex, setInventoryWeekIndex] = useState(0);
    const [currentInventoryIndex, setCurrentInventoryIndex] = useState(0);
    const [inventoryIngredients, setInventoryIngredients] = useState<Array<{
        name: string; baseIng: string; needed: number; unit: string; available: number; missing: boolean;
    }>>([]);

    // Swipe-states
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const minSwipeDistance = 50; // Hur långt man måste svepa (i pixlar)

        if (distance > minSwipeDistance) {
            // Svep Vänster -> Nästa
            if (currentInventoryIndex < inventoryIngredients.length - 1) {
                setCurrentInventoryIndex(prev => prev + 1);
            }
        } else if (distance < -minSwipeDistance) {
            // Svep Höger -> Föregående
            if (currentInventoryIndex > 0) {
                setCurrentInventoryIndex(prev => prev - 1);
            }
        }
    };

    const weeks = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const calculatedWeeks = [];
        for (let w = 0; w < 3; w++) {
            let weekStart: Date;
            let weekEnd: Date;

            if (w === 0) {
                weekStart = new Date(today);
                weekEnd = new Date(today);
                const dayOfWeek = weekEnd.getDay();
                const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
                weekEnd.setDate(weekEnd.getDate() + daysUntilSunday);
                weekEnd.setHours(23, 59, 59, 999);
            } else {
                const dayOfWeek = today.getDay();
                const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
                weekStart = new Date(today);
                weekStart.setDate(today.getDate() + daysUntilNextMonday + ((w - 1) * 7));
                weekStart.setHours(0, 0, 0, 0);

                weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);
            }

            const weekMeals = mealPlan.filter(meal => {
                const [year, month, day] = meal.date.split('-').map(Number);
                const mealDate = new Date(year, month - 1, day, 12, 0, 0, 0);
                return mealDate.getTime() >= weekStart.getTime() && mealDate.getTime() <= weekEnd.getTime();
            });

            const weekNeeds: { [key: string]: { amount: number, unit: string, name: string, baseIng: string } } = {};

            weekMeals.forEach(meal => {
                if (!meal.recipe.ingredients || meal.recipe.ingredients.length === 0) return;

                const portions = meal.servings || 4;
                const originalServings = meal.recipe.servings || 4;
                const scale = portions / originalServings;

                meal.recipe.ingredients.forEach(ing => {
                    const match = ing.match(/^(\d+(?:[.,]\d+)?)\s*([a-zåäö]+)?\s+(.+)/i);
                    if (match) {
                        const amount = parseFloat(match[1].replace(',', '.'));
                        let unit = (match[2] || '').toLowerCase();
                        if (unit === 'gram') unit = 'g';
                        if (unit === 'liter') unit = 'l';
                        if (unit === 'klyfta') unit = 'klyftor';

                        const name = match[3].trim();
                        const baseIng = name.toLowerCase();

                        if (!weekNeeds[baseIng]) {
                            weekNeeds[baseIng] = { amount: 0, unit, name, baseIng };
                        }

                        let scaledAmount = amount * scale;
                        const targetUnit = weekNeeds[baseIng].unit;

                        if (unit === 'kg' && targetUnit === 'g') scaledAmount *= 1000;
                        else if (unit === 'g' && targetUnit === 'kg') scaledAmount /= 1000;
                        else if (unit === 'l' && targetUnit === 'ml') scaledAmount *= 1000;
                        else if (unit === 'ml' && targetUnit === 'l') scaledAmount /= 1000;
                        else if (unit === 'dl' && targetUnit === 'ml') scaledAmount *= 100;
                        else if (unit === 'ml' && targetUnit === 'dl') scaledAmount /= 100;

                        weekNeeds[baseIng].amount += scaledAmount;
                    } else {
                        const cleanName = ing.replace(/\(.*?\)/g, '').trim();
                        const baseIng = cleanName.toLowerCase();
                        if (!weekNeeds[baseIng]) {
                            weekNeeds[baseIng] = { amount: 0, unit: '', name: cleanName, baseIng };
                        }
                    }
                });
            });

            const allIngredientsList = Object.values(weekNeeds).map(need => {
                let storedAmount = 0;
                let hasExplicitQuantity = false;
                const targetUnit = need.unit;

                const baseIngWords = need.baseIng.split(/\s+eller\s+|\s+/i).filter(w => w.length >= 3);
                if (baseIngWords.length === 0) baseIngWords.push(need.baseIng);

                const matchingIngredients = ingredients.filter(i => {
                    const storedName = i.name.toLowerCase();
                    if (storedName === need.baseIng) return true;
                    return baseIngWords.some(word => storedName === word || storedName.includes(word) || word.includes(storedName));
                });

                matchingIngredients.forEach(mIng => {
                    if (mIng.quantity && mIng.quantity.match(/\d/)) {
                        hasExplicitQuantity = true;
                        const qtyMatch = mIng.quantity.match(/^(\d+(?:[.,]\d+)?)\s*([a-zåäö]+)?/i);
                        if (qtyMatch) {
                            let amt = parseFloat(qtyMatch[1].replace(',', '.'));
                            let u = (qtyMatch[2] || '').toLowerCase();
                            if (u === 'gram') u = 'g';
                            if (u === 'liter') u = 'l';

                            if (u === 'kg' && targetUnit === 'g') amt *= 1000;
                            else if (u === 'g' && targetUnit === 'kg') amt /= 1000;
                            else if (u === 'l' && targetUnit === 'ml') amt *= 1000;
                            else if (u === 'ml' && targetUnit === 'l') amt /= 1000;
                            else if (u === 'dl' && targetUnit === 'ml') amt *= 100;
                            else if (u === 'ml' && targetUnit === 'dl') amt /= 100;

                            storedAmount += amt;
                        }
                    }
                });

                let isMissing = false;
                let missingAmount = 0;

                if (matchingIngredients.length === 0) {
                    isMissing = true;
                    missingAmount = need.amount;
                } else if (hasExplicitQuantity) {
                    if (storedAmount < need.amount) {
                        isMissing = true;
                        missingAmount = need.amount - storedAmount;
                    }
                }

                const formatNumber = (num: number) => num % 1 === 0 ? num : parseFloat(num.toFixed(1));

                const neededAmountFormatted = formatNumber(need.amount);
                const missingAmountFormatted = formatNumber(missingAmount);
                const storedFormatted = formatNumber(storedAmount);

                let displayName = need.amount > 0 ? `${neededAmountFormatted} ${need.unit} ${need.name}`.trim() : need.name;
                let missingName = missingAmount > 0 ? `${missingAmountFormatted} ${need.unit} ${need.name}`.trim() : need.name;

                if (isMissing) {
                    if (storedAmount > 0) {
                        displayName = `${neededAmountFormatted} ${need.unit} ${need.name} (Har ${storedFormatted} ${need.unit}, saknas ${missingAmountFormatted} ${need.unit})`;
                    } else {
                        displayName = `${neededAmountFormatted} ${need.unit} ${need.name} (Saknas helt)`;
                    }
                }

                return {
                    name: displayName,
                    missingName: missingName,
                    baseIng: need.baseIng,
                    missing: isMissing,
                    amount: need.amount,
                    unit: need.unit,
                    available: storedAmount
                };
            });

            const totalPortions = weekMeals.reduce((sum, meal) => sum + (meal.servings || 4), 0);

            calculatedWeeks.push({ weekStart, weekEnd, meals: weekMeals.length, allIngredients: allIngredientsList, totalPortions });
        }
        return calculatedWeeks;
    }, [mealPlan, ingredients]);

    const moveCheckedToStorage = () => {
        const toMove = shoppingList.filter(s => s.checked);
        if (toMove.length === 0) return;
        toMove.forEach(item => {
            saveIngredient({ id: Date.now().toString() + Math.random(), name: item.name, source: 'manual', location: 'Skafferi', category: 'Övrigt' });
            removeShoppingItem(item.id);
        });
        alert(`Flyttade ${toMove.length} varor till lagring`);
    };

    return (
        <div className="pb-20">
        {/* Clean Premium Header */}
        <div className="relative pt-12 pb-6 px-6 bg-transparent">
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-[#7A7A7A] hover:bg-black/5 transition-all">
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button onClick={() => navigate('/settings')} className="p-2 rounded-full text-[#7A7A7A] hover:bg-black/5 transition-all">
                    <Settings className="w-5 h-5" />
                </button>
            </div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-1 tracking-tight">Inköpslista</h1>
            <p className="text-[#8E8E93] text-sm font-medium">Bocka av det du behöver</p>
        </div>

        <div className="p-4 space-y-4">
        {/* Manual shopping list */}
        <div className={clsx("rounded-2xl p-4 shadow-sm border", t.cardBg, t.border)}>
        <h3 className="font-bold mb-3">Min inköpslista</h3>
        <div className="flex gap-2 mb-4">
        <input type="text" value={manualShopping} onChange={e => setManualShopping(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveShoppingItem({ id: Date.now().toString(), name: manualShopping, checked: false }).then(()=>setManualShopping(''))} placeholder="Lägg till vara..." className={clsx("flex-1 px-5 py-3.5 rounded-2xl text-[15px] outline-none transition-all", t.bgInput)} />
        <button onClick={() => saveShoppingItem({ id: Date.now().toString(), name: manualShopping, checked: false }).then(()=>setManualShopping(''))} className={clsx("px-5 rounded-2xl font-bold shadow-sm transition-transform active:scale-95", t.btnPrimary)}><Plus className="w-5 h-5"/></button>
        </div>
        <div className="space-y-2">
        {shoppingList.length === 0 ? (
            <p className="text-sm italic opacity-50 text-center py-4">Lägg till varor manuellt</p>
        ) : (
            shoppingList.map(item => (
                <div key={item.id} className={clsx("flex items-center gap-3 p-3 border rounded-xl transition-colors", item.checked ? "opacity-50 " + t.bgAlt : t.bgInput)}>
                <button onClick={() => saveShoppingItem({...item, checked: !item.checked})} className={clsx("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors", item.checked ? "bg-[#34C759] border-[#34C759] text-white" : "border-[#3C3C43]/20 bg-white")}>
                {item.checked && <Check className="w-4 h-4 text-white" />}
                </button>
                <span className={clsx("flex-1 text-sm font-medium", item.checked && "line-through")}>{item.name}</span>
                <button onClick={() => removeShoppingItem(item.id)} className="text-red-400 hover:text-red-500 p-1"><X className="w-4 h-4"/></button>
                </div>
            ))
        )}
        </div>
        {shoppingList.some(s => s.checked) && (
            <button onClick={moveCheckedToStorage} className="w-full mt-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Flytta inhandlat till lagring
            </button>
        )}
        </div>

        {/* Weekly meal plan shopping needs */}
        <div className="space-y-3">
        <h3 className="font-bold text-lg">Behövs för veckoplaneringen</h3>
        {weeks.map((week, idx) => (
            <div key={idx} className={clsx("rounded-2xl p-4 shadow-sm border", t.cardBg, t.border)}>
            <div className="flex items-center justify-between mb-3">
            <div>
            <h4 className="font-bold">{idx === 0 ? 'Denna vecka' : idx === 1 ? 'Nästa vecka' : `Vecka ${idx + 1}`}</h4>
            <p className="text-xs opacity-60">
            {week.weekStart.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} - {week.weekEnd.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
            </p>
            </div>
            <div className="flex gap-2">
            <span className="text-[11px] bg-[#E3EAE0] text-[#2D2D2D] px-3 py-1 rounded-full font-bold">{week.meals} recept</span>
            <span className="text-[11px] bg-[#E3EAE0] text-[#2D2D2D] px-3 py-1 rounded-full font-bold">{week.totalPortions} portioner</span>
            </div>
            </div>
            <button
            onClick={() => {
                setInventoryWeekIndex(idx);
                setInventoryIngredients(week.allIngredients.map(ing => ({
                    name: ing.name, baseIng: ing.baseIng, needed: ing.amount, unit: ing.unit, available: ing.available, missing: ing.missing
                })));
                setCurrentInventoryIndex(0);
                setShowInventoryDialog(true);
                setIsModalOpen(true);
            }}
            className="w-full mb-4 py-3 bg-[#C48B71] hover:bg-[#b57d63] text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
            <ClipboardCheck className="w-4 h-4" /> Starta Inventering
            </button>

            {week.allIngredients && week.allIngredients.length > 0 ? (
                <div className="space-y-2">
                {week.allIngredients.map((ing, i) => {
                    const itemToAdd = ing.missingName || ing.name;
                    const alreadyInList = shoppingList.some(s => s.name.toLowerCase() === itemToAdd.toLowerCase() || s.name.toLowerCase().includes(ing.baseIng.toLowerCase()));
                    return (
                        <div key={i} className={clsx("flex items-center gap-2 text-sm", ing.missing && "text-red-600")}>
                        <span className={clsx("w-2 h-2 rounded-full", ing.missing ? "bg-red-500" : "bg-green-500")}></span>
                        <span className="flex-1 font-medium">{ing.name}</span>
                        {ing.missing && (
                            alreadyInList ? (
                                <span className="text-xs text-green-600 font-bold">✓ I listan</span>
                            ) : (
                                <button onClick={() => saveShoppingItem({ id: Date.now().toString() + i, name: itemToAdd, checked: false })} className="text-purple-600 hover:text-purple-500 text-xs font-bold whitespace-nowrap">
                                + Lägg till
                                </button>
                            )
                        )}
                        </div>
                    );
                })}
                </div>
            ) : (
                <p className="text-sm italic opacity-50 py-2">Inga recept planerade</p>
            )}
            </div>
        ))}
        </div>

        {/* Snygg Swipe-Inventeringsdialog */}
        {showInventoryDialog && inventoryIngredients.length > 0 && (() => {
            const currentIng = inventoryIngredients[currentInventoryIndex];
            const progressPercent = ((currentInventoryIndex + 1) / inventoryIngredients.length) * 100;

            return (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center z-[70] p-0 sm:p-4 pb-safe">
                <div className={clsx("w-full sm:max-w-md h-[85vh] sm:h-auto rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative", t.cardBg)}>

                {/* Header och Progress */}
                <div className="bg-[#F2F2F7] dark:bg-slate-800 p-6 pb-8 text-black dark:text-white flex-shrink-0 border-b border-[#3C3C43]/10">
                <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" /> Inventering
                </h2>
                <button onClick={() => { setShowInventoryDialog(false); setIsModalOpen(false); }} className="p-2 bg-black/5 text-[#2D2D2D] dark:text-white hover:bg-black/10 rounded-full transition-colors">
                <X className="w-4 h-4" />
                </button>
                </div>
                <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Framsteg</span>
                <span className="text-sm font-bold">{currentInventoryIndex + 1} av {inventoryIngredients.length}</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                <div
                className="bg-white rounded-full h-1.5 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
                />
                </div>
                </div>

                {/* Det aktiva kortet med Swipe-hantering */}
                <div
                className="flex-1 flex flex-col p-6 -mt-4 bg-transparent rounded-t-[2rem] relative z-10"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                >
                <div className={clsx("flex-1 p-6 rounded-3xl shadow-lg border flex flex-col justify-center items-center text-center transition-all duration-300", t.bgAlt, t.border)}>

                <p className="text-xs uppercase font-bold text-gray-400 mb-2 flex items-center gap-2">
                <ChevronLeft className="w-4 h-4 opacity-50" /> Svep <ChevronRight className="w-4 h-4 opacity-50" />
                </p>

                <h3 className="text-3xl font-bold mb-2 text-[#2D2D2D] dark:text-white pb-1">
                {currentIng.name}
                </h3>

                <div className="my-6 w-full h-px bg-gray-200 dark:bg-gray-700"></div>

                <div className="w-full space-y-4">
                <div className="flex flex-col items-center">
                <span className="text-sm opacity-60 mb-1">Mängd som behövs</span>
                <span className="text-2xl font-bold">{Math.ceil(currentIng.needed)} <span className="text-lg opacity-70">{currentIng.unit}</span></span>
                </div>

                <div className={clsx("p-4 rounded-2xl border-2", t.bgInput, "border-blue-500/30 w-full")}>
                <label className="text-xs uppercase font-bold opacity-60 mb-2 block text-left">Faktisk mängd i lagret:</label>
                <div className="flex items-center gap-3">
                <input
                type="number"
                value={currentIng.available === 0 ? '' : currentIng.available}
                onChange={(e) => {
                    const newAvailable = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setInventoryIngredients(prev => prev.map((ing, i) => i === currentInventoryIndex ? { ...ing, available: newAvailable } : ing));
                }}
                className={clsx("flex-1 px-4 py-3 rounded-xl text-xl font-bold outline-none shadow-inner", t.bgAlt)}
                placeholder="0"
                />
                <span className="text-lg font-bold opacity-50 w-12 text-left">{currentIng.unit}</span>
                </div>
                </div>

                {currentIng.available > 0 && (
                    <div className={clsx("p-3 rounded-xl text-sm font-bold animate-in fade-in zoom-in duration-200", currentIng.available >= currentIng.needed ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600")}>
                    {currentIng.available >= currentIng.needed ? `✅ Perfekt! (+${Math.ceil(currentIng.available - currentIng.needed)} ${currentIng.unit} över)` : `⚠️ Saknas fortfarande ${Math.ceil(currentIng.needed - currentIng.available)} ${currentIng.unit}`}
                    </div>
                )}
                </div>
                </div>
                </div>

                {/* Botten-navigering */}
                <div className={clsx("p-6 pt-0 flex-shrink-0 flex gap-3", t.cardBg)}>
                <button
                onClick={() => { if (currentInventoryIndex > 0) setCurrentInventoryIndex(currentInventoryIndex - 1); }}
                disabled={currentInventoryIndex === 0}
                className={clsx("p-4 rounded-2xl font-bold flex items-center justify-center transition-all", currentInventoryIndex === 0 ? "opacity-30 bg-gray-400" : t.bgInput + " border shadow-sm hover:shadow")}
                >
                <ChevronLeft className="w-6 h-6" />
                </button>

                {currentInventoryIndex < inventoryIngredients.length - 1 ? (
                    <button
                    onClick={() => setCurrentInventoryIndex(currentInventoryIndex + 1)}
                    className="flex-1 py-4 rounded-2xl font-bold bg-[#C48B71] hover:bg-[#b57d63] text-white shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                    Nästa vara <ChevronRight className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                    onClick={() => {
                        inventoryIngredients.forEach(ing => {
                            if (ing.available > 0) {
                                const existingIng = ingredients.find(i => i.name.toLowerCase() === ing.baseIng.toLowerCase());
                                if (existingIng) saveIngredient({ ...existingIng, quantity: `${ing.available} ${ing.unit}`.trim() });
                                else saveIngredient({ id: Date.now().toString() + Math.random(), name: ing.baseIng, category: 'Övrigt', quantity: `${ing.available} ${ing.unit}`.trim(), location: 'Skafferi', source: 'manual' });
                            }
                        });
                        setShowInventoryDialog(false);
                        setIsModalOpen(false);
                        alert('✅ Lageruppgifter sparade!');
                    }}
                    className="flex-1 py-4 rounded-2xl font-bold bg-[#A9B8A2] hover:bg-[#98A791] text-white shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                    <CheckCircle2 className="w-5 h-5" /> Spara Inventering
                    </button>
                )}
                </div>

                </div>
                </div>
            );
        })()}
        </div>
        </div>
    );
};
