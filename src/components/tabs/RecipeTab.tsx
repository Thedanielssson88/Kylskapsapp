import React, { useState } from 'react';
import { Plus, Heart, Clock, X, MessageCircle, Calendar, RefreshCw, ShoppingCart, Sun, Moon, Settings, ChefHat } from 'lucide-react';
import { clsx } from 'clsx';
import { usePantry } from '../../context/PantryContext';
import { Recipe, MealType } from '../../types/pantry';
import { callAI } from '../../services/aiService';
import { putData, STORES } from '../../services/dbService';

export const RecipeTab = ({ t, setActiveTab, setChatInput, setAttachedRecipe, setIsModalOpen, darkMode, setDarkMode, navigate }: { t: any, setActiveTab: any, setChatInput: any, setAttachedRecipe: any, setIsModalOpen: any, darkMode: boolean, setDarkMode: (val: boolean) => void, navigate: any }) => {
    const { ingredients, savedRecipes, generatedRecipes, toggleSavedRecipe, setGeneratedRecipes, setIsWorking, setLoadingMessage, shoppingList, saveShoppingItem, savePlannedMeal } = usePantry();

    const [recipeView, setRecipeView] = useState<'generated' | 'saved'>('generated');
    const [recipeStrictness, setRecipeStrictness] = useState<'flexible' | 'strict'>('flexible');
    const [recipeCount, setRecipeCount] = useState<number>(3);
    const [activeDiets, setActiveDiets] = useState<string[]>([]);
    const dietOptions = ["Vegetariskt", "Veganskt", "Glutenfritt", "Laktosfritt", "Lågkolhydrat"];

    const [recipeUrl, setRecipeUrl] = useState('');
    const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
    const [recipeServings, setRecipeServings] = useState<number>(4);

    const [showScheduleDialog, setShowScheduleDialog] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleMealType, setScheduleMealType] = useState<MealType>('dinner');

    React.useEffect(() => {
        if (viewingRecipe) setRecipeServings(viewingRecipe.servings || 4);
    }, [viewingRecipe]);

        const generateRecipes = async () => {
            if (ingredients.length === 0) return alert('Lägg till ingredienser först!');
            setIsWorking(true);
            setLoadingMessage(`Skapar ${recipeCount} smaskiga recept...`);

            const currentItems = ingredients.map(i => i.name).join(', ');
            const dietContext = activeDiets.length > 0 ? `OBS: Recepten MÅSTE vara anpassade för: ${activeDiets.join(', ')}.` : '';

            const strictPrompt = `Jag har EXAKT följande ingredienser: ${currentItems}. ${dietContext}
            Ge mig ${recipeCount} recept för 4 portioner. Du får BARA använda de ingredienser jag har (plus salt/peppar/olja/vatten).
            Svara i exakt detta JSON format: [{"title":"..", "description":"En kort lockande beskrivning av rätten (1-2 meningar)", "ingredients":["250 g ris", "400 g bönor", ..], "missingIngredients":[], "instructions":"Steg 1. ..\\nSteg 2. ..", "prepTime":"15 min", "cookTime":"30 min", "servings":4, "calories":450, "protein":15, "carbs":60, "fat":12, "tags":["vegetariskt","snabbt"]}]
            VIKTIGT: Ingredienser ska ha exakta mängder (g, ml, st, msk, tsk). Instructions ska vara numrerade steg. Inkludera alltid näringsvärden per portion och en description.`;

            const flexPrompt = `Jag har följande ingredienser: ${currentItems}. ${dietContext}
            Ge mig ${recipeCount} recept för 4 portioner. Det är okej om 1-3 ingredienser saknas per recept för att göra en godare rätt, men prioritera det jag har.
            Svara i exakt detta JSON format: [{"title":"..", "description":"En kort lockande beskrivning av rätten (1-2 meningar)", "ingredients":["250 g ris", "400 g bönor", ..], "missingIngredients":["vad som saknas med mängd"], "instructions":"Steg 1. ..\\nSteg 2. ..", "prepTime":"15 min", "cookTime":"30 min", "servings":4, "calories":450, "protein":15, "carbs":60, "fat":12, "tags":["vegetariskt","snabbt"]}]
            VIKTIGT: Ingredienser ska ha exakta mängder (g, ml, st, msk, tsk). Instructions ska vara numrerade steg. Inkludera alltid näringsvärden per portion och en description.`;

            try {
                const aiResponse = await callAI(recipeStrictness === 'strict' ? strictPrompt : flexPrompt);

                // Försök hitta JSON-array i svaret - ta första kompletta array
                let jsonMatch = aiResponse.match(/\[\s*\{[\s\S]*?\}\s*\]/);

                // Om det inte fungerade, prova med mer generös regex
                if (!jsonMatch) {
                    jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
                }

                if (jsonMatch) {
                    try {
                        const parsedRecipes = JSON.parse(jsonMatch[0]);
                        if (Array.isArray(parsedRecipes) && parsedRecipes.length > 0) {
                            setGeneratedRecipes(parsedRecipes);
                            setRecipeView('generated');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            await putData(STORES.GENERATED_RECIPES, { timestamp: Date.now(), recipes: parsedRecipes });
                        } else {
                            alert('AI:n returnerade inga recept. Försök igen.');
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError, 'Matched text:', jsonMatch[0].substring(0, 200));
                        alert(`AI svarade men JSON-formatet var felaktigt. Försök igen.`);
                    }
                } else {
                    alert(`AI svarade men utan JSON-format. Svar: ${aiResponse.substring(0, 200)}`);
                }
            } catch (error) {
                console.error('Recipe generation error:', error);
                alert(`Kunde inte generera recept: ${error instanceof Error ? error.message : 'Okänt fel'}`);
            } finally {
                setIsWorking(false);
            }
        };

        const importRecipeFromUrl = async () => {
            if (!recipeUrl.trim()) return;
            setIsWorking(true);
            setLoadingMessage('Hämtar recept från webben...');

            try {
                let contentToAnalyze = recipeUrl;
                if (recipeUrl.match(/^https?:\/\//)) {
                    try {
                        setLoadingMessage('Laddar receptsida...');
                        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(recipeUrl)}`;
                        const fetchResponse = await fetch(proxyUrl);

                        if (fetchResponse.ok) {
                            const htmlContent = await fetchResponse.text();
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(htmlContent, 'text/html');

                            let imageUrl = '';
                            const ogImage = doc.querySelector('meta[property="og:image"]');
                            const twitterImage = doc.querySelector('meta[name="twitter:image"]');
                            const mainImg = doc.querySelector('article img, .recipe img, main img, img[alt*="recept" i], img[alt*="recipe" i]');

                            if (ogImage) imageUrl = ogImage.getAttribute('content') || '';
                            else if (twitterImage) imageUrl = twitterImage.getAttribute('content') || '';
                            else if (mainImg) imageUrl = mainImg.getAttribute('src') || '';

                            if (imageUrl && !imageUrl.startsWith('http')) {
                                const baseUrl = new URL(recipeUrl);
                                imageUrl = new URL(imageUrl, baseUrl.origin).href;
                            }

                            doc.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove());
                            contentToAnalyze = doc.body.textContent || doc.body.innerText || '';
                            contentToAnalyze = contentToAnalyze.split('\n').map(line => line.trim()).filter(line => line).join('\n');
                            if (imageUrl) contentToAnalyze = `BILD-URL: ${imageUrl}\n\n${contentToAnalyze}`;
                            setLoadingMessage('Extraherar recept...');
                        }
                    } catch (fetchError) {
                        console.warn('Kunde inte hämta HTML, använder URL direkt:', fetchError);
                    }
                }

                const prompt = `Extrahera receptinformation från denna text/innehåll:\n\n${contentToAnalyze}\n\nDu MÅSTE svara med en JSON-array med exakt ett recept-objekt.
                Format:
                [{
                    "title": "Receptnamn", "description": "Kort beskrivning", "ingredients": ["400 g pasta", "2 msk olja"], "instructions": "Steg-för-steg instruktioner...", "prepTime": "15 min", "cookTime": "30 min", "servings": 4, "calories": 450, "protein": 20, "carbs": 60, "fat": 15, "tags": ["vegetariskt"], "imageUrl": "URL till bild"
                }]`;

                const aiResponse = await callAI(prompt);

                // Försök hitta JSON-array i svaret - ta första kompletta array
                let jsonMatch = aiResponse.match(/\[\s*\{[\s\S]*?\}\s*\]/);

                // Om det inte fungerade, prova med mer generös regex
                if (!jsonMatch) {
                    jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
                }

                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            const recipe = parsed[0];
                            await toggleSavedRecipe(recipe);
                            alert(`✅ Receptet "${recipe.title}" har sparats till dina favoriter!`);
                            setRecipeUrl('');
                        } else {
                            alert('Kunde inte hitta något recept i svaret.');
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError, 'Matched text:', jsonMatch[0].substring(0, 200));
                        alert(`Kunde inte tolka receptet. AI:n svarade i fel format.`);
                    }
                } else {
                    alert('Kunde inte extrahera receptet från sidan.');
                }
            } catch (error) {
                console.error(error);
                alert(`Fel vid import: ${error instanceof Error ? error.message : 'Okänt fel'}`);
            } finally {
                setIsWorking(false);
            }
        };

        return (
            <div className="pb-20">
            {/* Ny ren Hero Header */}
            <div className="relative pt-12 pb-2 px-6">
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-[#7A7A7A] hover:bg-[#E8E5DC] transition-all">
                        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button onClick={() => navigate('/settings')} className="p-2 rounded-full text-[#7A7A7A] hover:bg-[#E8E5DC] transition-all">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
                <h1 className="text-3xl font-semibold text-[#2D2D2D] mb-1 tracking-tight">Generera Recept</h1>
                <p className="text-[#7A7A7A] text-sm font-medium">Smarta matförslag utifrån ditt lagersaldo</p>
            </div>

            <div className="p-4 space-y-4">
            <div className={clsx("p-4 rounded-2xl shadow-sm border space-y-4", t.cardBg, t.border)}>
            <div className="flex gap-2 bg-black/5 dark:bg-black/20 p-1 rounded-xl">
            <button onClick={() => setRecipeView('generated')} className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", recipeView === 'generated' ? "bg-white dark:bg-gray-700 shadow text-purple-500" : "opacity-60")}>Förslag</button>
            <button onClick={() => setRecipeView('saved')} className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", recipeView === 'saved' ? "bg-white dark:bg-gray-700 shadow text-purple-500" : "opacity-60")}>Mina Sparade</button>
            </div>

            {recipeView === 'saved' && (
                <div className="space-y-3">
                <h2 className="font-bold text-xs uppercase opacity-70">Importera recept</h2>
                <div className="flex gap-2">
                <textarea value={recipeUrl} onChange={(e) => setRecipeUrl(e.target.value)} placeholder="URL eller recepttext..." rows={3} className={clsx("flex-1 px-3 py-2 rounded-xl text-sm outline-none border resize-none", t.bgInput, t.border)} />
                <button onClick={importRecipeFromUrl} disabled={!recipeUrl.trim()} className={clsx("px-4 py-2 rounded-xl font-bold flex items-center gap-2 self-start", t.btnPrimary, !recipeUrl.trim() && "opacity-50")}>
                <Plus className="w-4 h-4" /> Import
                </button>
                </div>
                </div>
            )}

            {recipeView === 'generated' && (
                <>
                <h2 className="font-bold text-xs uppercase opacity-70">Diet & Allergi</h2>
                <div className="flex flex-wrap gap-2">
                {dietOptions.map(diet => (
                    <button key={diet} onClick={() => setActiveDiets(prev => prev.includes(diet) ? prev.filter(d=>d!==diet) : [...prev, diet])} className={clsx("px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors", activeDiets.includes(diet) ? "bg-[#A9B8A2] text-white" : "bg-white text-[#7A7A7A] border border-[#E0E0E0]")}>{diet}</button>
                ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <h2 className="font-bold text-xs uppercase opacity-70">Antal recept:</h2>
                <div className="flex gap-1 bg-black/5 dark:bg-black/20 p-1 rounded-lg">
                {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRecipeCount(n)} className={clsx("w-8 h-8 rounded-md text-xs font-bold transition-all", recipeCount === n ? "bg-purple-500 text-white shadow" : "opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10")}>{n}</button>
                ))}
                </div>
                </div>
                <div className="flex gap-2 mt-2">
                <button onClick={() => setRecipeStrictness('flexible')} className={clsx("flex-1 py-2 text-xs font-bold rounded-xl border", recipeStrictness === 'flexible' ? t.btnPrimary : t.bgInput)}>Tillåt Inköp</button>
                <button onClick={() => setRecipeStrictness('strict')} className={clsx("flex-1 py-2 text-xs font-bold rounded-xl border", recipeStrictness === 'strict' ? t.btnPrimary : t.bgInput)}>Bara Vad Jag Har</button>
                </div>
                <button onClick={generateRecipes} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md">
                <RefreshCw className="w-5 h-5" /> Generera {recipeCount} Recept
                </button>
                </>
            )}
            </div>

            <div className="grid gap-3">
            {(recipeView === 'generated' ? generatedRecipes : savedRecipes).map((recipe, idx) => {
                const isSaved = savedRecipes.some(r => r.title === recipe.title);
                return (
                    <div key={idx} onClick={() => { setViewingRecipe(recipe); setIsModalOpen(true); }} className={clsx("rounded-3xl overflow-hidden relative cursor-pointer transition-shadow", t.cardBg, t.border)}>
                        <button onClick={(e) => { e.stopPropagation(); toggleSavedRecipe(recipe); }} className="absolute top-3 right-3 p-2.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full transition-colors z-10">
                            <Heart className="w-5 h-5" fill={isSaved ? "#C48B71" : "none"} color={isSaved ? "#C48B71" : "white"} strokeWidth={2} />
                        </button>
                        
                        {/* Bilden */}
                        {recipe.imageUrl ? (
                            <div className="relative h-48 overflow-hidden">
                                <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                        ) : (
                            <div className="h-48 bg-[#E3EAE0] flex items-center justify-center">
                                <span className="text-[#A9B8A2] opacity-50"><ChefHat size={48} /></span>
                            </div>
                        )}

                        {/* Texten på kortet */}
                        <div className="p-5">
                            {/* Nya fina taggar över rubriken */}
                            <div className="flex gap-2 mb-2">
                                 {recipe.prepTime && <span className="bg-[#A9B8A2] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Snabblagat</span>}
                                 {recipe.calories && recipe.calories > 500 && <span className="bg-[#A9B8A2] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Mättande</span>}
                            </div>
                            
                            <h3 className="font-semibold text-lg text-[#2D2D2D] mb-1">{recipe.title}</h3>
                            <p className="text-sm text-[#7A7A7A] line-clamp-2 mb-3">
                                {recipe.description || recipe.instructions.split('\n')[0].substring(0, 100) + '...'}
                            </p>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-xs text-[#C48B71] font-semibold">
                                    ★ 4.8 <span className="text-[#7A7A7A] font-normal">(75)</span>
                                </div>
                                {(recipe.prepTime || recipe.cookTime) && (
                                    <div className="flex items-center gap-1.5 text-xs text-[#7A7A7A]">
                                        <Clock className="w-4 h-4" /> {recipe.prepTime || recipe.cookTime}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            </div>

            {/* Recipe Detail Modal */}
            {viewingRecipe && (() => {
                const scaleIngredient = (ingredient: string, originalServings: number, newServings: number): string => {
                    const scale = newServings / originalServings;
                    const match = ingredient.match(/^(\d+(?:[.,]\d+)?)\s*([a-zåäö]+)?\s+(.*)/i);
                    if (match) {
                        const amount = parseFloat(match[1].replace(',', '.'));
                        const unit = match[2] || '';
                        const rest = match[3];
                        const newAmount = amount * scale;
                        const formatted = newAmount % 1 === 0 ? newAmount.toString() : newAmount.toFixed(1).replace('.', ',');
                        return `${formatted} ${unit} ${rest}`.trim();
                    }
                    return ingredient;
                };

                const originalServings = viewingRecipe.servings || 4;

                const dynamicIngredients = viewingRecipe.ingredients.map(ing => {
                    const scaled = scaleIngredient(ing, originalServings, recipeServings);
                    const match = scaled.match(/^(\d+(?:[.,]\d+)?)\s*([a-zåäö]+)?\s+(.+)/i);

                    if (!match) {
                        const cleanName = scaled.replace(/\(.*?\)/g, '').trim().toLowerCase();
                        const exists = ingredients.some(i => i.name.toLowerCase().includes(cleanName) || cleanName.includes(i.name.toLowerCase()));
                        return { original: scaled, missingText: scaled, toBuy: scaled, isMissing: !exists };
                    }

                    const neededAmount = parseFloat(match[1].replace(',', '.'));
                    let unit = (match[2] || '').toLowerCase();
                    if (unit === 'gram') unit = 'g';
                    if (unit === 'liter') unit = 'l';
                    const name = match[3].trim();

                    const baseIngWords = name.toLowerCase().split(/\s+eller\s+|\s+/i).filter(w => w.length >= 3);
                    if (baseIngWords.length === 0) baseIngWords.push(name.toLowerCase());

                    let storedAmount = 0;
                    let hasExplicitQuantity = false;

                    const matchingIngredients = ingredients.filter(i => {
                        const storedName = i.name.toLowerCase();
                        if (storedName === name.toLowerCase()) return true;
                        return baseIngWords.some(word => storedName.includes(word) || word.includes(storedName));
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

                                if (u === 'kg' && unit === 'g') amt *= 1000;
                                else if (u === 'g' && unit === 'kg') amt /= 1000;
                                else if (u === 'l' && unit === 'ml') amt *= 1000;
                                else if (u === 'ml' && unit === 'l') amt /= 1000;
                                else if (u === 'dl' && unit === 'ml') amt *= 100;
                                else if (u === 'ml' && unit === 'dl') amt /= 100;

                                storedAmount += amt;
                            }
                        }
                    });

                    let isMissing = false;
                    let missingAmount = 0;

                    if (matchingIngredients.length === 0) {
                        isMissing = true;
                        missingAmount = neededAmount;
                    } else if (hasExplicitQuantity) {
                        if (storedAmount < neededAmount) {
                            isMissing = true;
                            missingAmount = neededAmount - storedAmount;
                        }
                    }

                    if (!isMissing) return { original: scaled, isMissing: false };

                    const formatNumber = (num: number) => num % 1 === 0 ? num : parseFloat(num.toFixed(1));
                    const missingAmountFormatted = formatNumber(missingAmount);
                    const toBuy = `${missingAmountFormatted} ${match[2] || ''} ${name}`.trim();

                    let displayMissing = toBuy;
                    if (storedAmount > 0) {
                        const storedFormatted = formatNumber(storedAmount);
                        displayMissing = `${scaled} (Har ${storedFormatted} ${match[2] || ''}, saknas ${missingAmountFormatted} ${match[2] || ''})`;
                    } else {
                        displayMissing = `${scaled} (Saknas helt)`;
                    }

                    return { original: scaled, missingText: displayMissing, toBuy: toBuy, isMissing: true };
                });

                const missingToRender = dynamicIngredients.filter(item => item.isMissing);
                const isSaved = savedRecipes.some(r => r.title === viewingRecipe.title);

                return (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
                    <div className={clsx("w-full sm:max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col", t.cardBg)}>
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex-shrink-0">
                    <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 pr-4"></div>
                    <button onClick={() => { setViewingRecipe(null); setIsModalOpen(false); }} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                    <h2 className="text-2xl font-bold">{viewingRecipe.title}</h2>
                    </div>
                    {viewingRecipe.imageUrl && (
                        <div className="px-6 pt-4"><img src={viewingRecipe.imageUrl} alt={viewingRecipe.title} className="w-full h-48 object-cover rounded-xl" /></div>
                    )}
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm uppercase opacity-60">Ingredienser</h3>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
                    <button onClick={() => { if (recipeServings > 1) setRecipeServings(recipeServings - 1); }} className="text-xl font-bold w-8 h-8">-</button>
                    <span className="font-bold min-w-[60px] text-center text-sm">{recipeServings} port.</span>
                    <button onClick={() => { if (recipeServings < 12) setRecipeServings(recipeServings + 1); }} className="text-xl font-bold w-8 h-8">+</button>
                    </div>
                    </div>

                    {/* Beskrivning utskriven */}
                    {viewingRecipe.description && (
                        <div className="mb-4">
                        <p className="text-sm leading-relaxed italic opacity-80">{viewingRecipe.description}</p>
                        </div>
                    )}

                    <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    {dynamicIngredients.map((item, i) => {
                        const match = item.original.match(/^([\d,.]+ (?:g|ml|dl|msk|tsk|st|krm)?)\s+(.+)$/i);
                        if (match) {
                            return (
                                <div key={i} className="flex items-start gap-3 py-1">
                                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.isMissing ? 'bg-red-500' : 'bg-purple-500'}`}></span>
                                <span className={`font-bold min-w-[70px] text-sm ${item.isMissing ? 'text-red-600 dark:text-red-500' : 'text-purple-600 dark:text-purple-400'}`}>{match[1]}</span>
                                <span className={`flex-1 text-sm ${item.isMissing ? 'text-red-700 dark:text-red-400' : ''}`}>{match[2]}</span>
                                </div>
                            );
                        }
                        return (
                            <div key={i} className="flex items-start gap-3 py-1">
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.isMissing ? 'bg-red-500' : 'bg-purple-500'}`}></span>
                            <span className={`flex-1 text-sm ${item.isMissing ? 'text-red-700 dark:text-red-400' : ''}`}>{item.original}</span>
                            </div>
                        );
                    })}
                    </div>

                    {missingToRender.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-red-600 dark:text-red-500" />
                        <span className="font-bold text-sm uppercase text-red-600 dark:text-red-500">{missingToRender.length} saknas hemma</span>
                        </div>
                        </div>
                        <div className="space-y-2">
                        {missingToRender.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 py-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span className="flex-1 text-sm text-red-700 dark:text-red-400">{item.missingText}</span>
                            </div>
                        ))}
                        </div>
                        <button onClick={() => {
                            missingToRender.forEach((item, i) => {
                                if (item.toBuy && !shoppingList.some(s => s.name.toLowerCase() === item.toBuy.toLowerCase())) {
                                    saveShoppingItem({ id: Date.now().toString() + i, name: item.toBuy, checked: false });
                                }
                            });
                            setViewingRecipe(null);
                            setIsModalOpen(false);
                        }} className="w-full mt-3 py-2 bg-red-500 text-white rounded-lg font-bold text-sm">Lägg bara till det som saknas</button>
                        </div>
                    )}
                    <div>
                    <h3 className="font-bold text-sm uppercase opacity-60 mb-2">Instruktioner</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{viewingRecipe.instructions}</p>
                    </div>
                    </div>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2 flex-shrink-0">
                    <div className="flex gap-2">
                    <button onClick={() => { setAttachedRecipe(viewingRecipe); setActiveTab('chat'); setViewingRecipe(null); setIsModalOpen(false); setChatInput(`Jag har en fråga om receptet "${viewingRecipe.title}": `); }} className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white"><MessageCircle className="w-5 h-5" /> Fråga Kocken</button>
                    <button onClick={() => { setShowScheduleDialog(true); setIsModalOpen(true); }} className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white"><Calendar className="w-5 h-5" /> Veckoschema</button>
                    </div>
                    <div className="flex gap-2">
                    <button onClick={() => { toggleSavedRecipe(viewingRecipe); setViewingRecipe(null); setIsModalOpen(false); }} className={clsx("flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2", isSaved ? "bg-red-500 text-white" : "bg-purple-500 text-white")}><Heart className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} /> {isSaved ? "Ta bort" : "Spara"}</button>
                    <button onClick={() => { setViewingRecipe(null); setIsModalOpen(false); }} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold">Stäng</button>
                    </div>
                    </div>
                    </div>
                    </div>
                );
            })()}

            {showScheduleDialog && viewingRecipe && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                <div className={clsx("w-full max-w-md rounded-2xl overflow-hidden", t.cardBg)}>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <div className="flex items-start justify-between mb-2">
                <h2 className="text-xl font-bold">Lägg till i Veckoschema</h2>
                <button onClick={() => { setShowScheduleDialog(false); setIsModalOpen(false); }} className="p-1"><X className="w-5 h-5" /></button>
                </div>
                </div>
                <div className="p-6 space-y-4">
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className={clsx("w-full px-4 py-3 rounded-xl border", t.bgInput)} />
                <div className="grid grid-cols-2 gap-2">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                    <button key={type} onClick={() => setScheduleMealType(type)} className={clsx("py-3 rounded-xl font-bold transition-colors", scheduleMealType === type ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700')}>
                    {type === 'breakfast' ? '🥐 Frukost' : type === 'lunch' ? '🥗 Lunch' : type === 'dinner' ? '🍝 Middag' : '🍪 Mellanmål'}
                    </button>
                ))}
                </div>
                <button onClick={() => {
                    if (!scheduleDate) return alert('Välj ett datum först!');
                    savePlannedMeal({ id: Date.now().toString(), date: scheduleDate, mealType: scheduleMealType, recipe: viewingRecipe, servings: viewingRecipe.servings || 4 });
                    setShowScheduleDialog(false); setViewingRecipe(null); setIsModalOpen(false); setActiveTab('mealplan');
                }} className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                Lägg till
                </button>
                </div>
                </div>
                </div>
            )}
            </div>
            </div>
        );
};
