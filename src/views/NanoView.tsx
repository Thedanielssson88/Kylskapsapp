import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Loader2, List, ChefHat, MessageSquare, ShoppingCart, Sun, Moon, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { PantryProvider, usePantry } from '../context/PantryContext';
import { PantryTab } from '../components/tabs/PantryTab';
import { ShoppingTab } from '../components/tabs/ShoppingTab';
import { RecipeTab } from '../components/tabs/RecipeTab';
import { MealPlanTab } from '../components/tabs/MealPlanTab';
import { ChatTab } from '../components/tabs/ChatTab';

const SmartPantryShell = () => {
    const navigate = useNavigate();
    const { isWorking, loadingMessage } = usePantry();
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('NANO_DARK_MODE') !== 'false');
    const [activeTab, setActiveTab] = useState<'pantry' | 'recipes' | 'shopping' | 'chat' | 'mealplan'>('pantry');

    // State för att dölja menyer när popup är öppen
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [chatInput, setChatInput] = useState('');
    const [attachedRecipe, setAttachedRecipe] = useState(null);

    useEffect(() => { localStorage.setItem('NANO_DARK_MODE', String(darkMode)); }, [darkMode]);

    const t = useMemo(() => darkMode ? {
        bg: 'bg-slate-950', bgAlt: 'bg-slate-900', bgInput: 'bg-slate-900',
        border: 'border-slate-800', text: 'text-slate-100', textMuted: 'text-slate-400', textWhite: 'text-white',
        cardBg: 'bg-slate-900/50 backdrop-blur-sm', btnPrimary: 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_4px_20px_rgb(124,58,237,0.3)]',
                      btnGhost: 'hover:bg-slate-800 text-slate-300', navBg: 'bg-slate-950/85', activeTabBg: 'bg-violet-500/10 text-violet-400'
    } : {
        bg: 'bg-slate-50', bgAlt: 'bg-white', bgInput: 'bg-slate-50',
        border: 'border-slate-200/60', text: 'text-slate-800', textMuted: 'text-slate-500', textWhite: 'text-slate-900',
        cardBg: 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]', btnPrimary: 'bg-violet-600 hover:bg-violet-700 text-white shadow-[0_4px_20px_rgb(124,58,237,0.25)]',
                      btnGhost: 'hover:bg-slate-100 text-slate-600', navBg: 'bg-white/85', activeTabBg: 'bg-violet-50 text-violet-700'
    }, [darkMode]);

    return (
        <div className={clsx("flex flex-col h-screen overflow-hidden", t.bg, t.text)}>
        <div className="flex-1 overflow-y-auto relative z-0 w-full max-w-2xl mx-auto">
        {isWorking && (
            <div className="absolute inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white transition-all animate-in fade-in duration-300">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-violet-400" />
            <p className="font-bold tracking-wider animate-pulse">{loadingMessage}</p>
            </div>
        )}

        <div className="animate-in fade-in duration-500">
        {activeTab === 'pantry' && <PantryTab t={t} setIsModalOpen={setIsModalOpen} darkMode={darkMode} setDarkMode={setDarkMode} navigate={navigate} />}
        {activeTab === 'shopping' && <ShoppingTab t={t} setIsModalOpen={setIsModalOpen} darkMode={darkMode} setDarkMode={setDarkMode} navigate={navigate} />}
        {activeTab === 'recipes' && <RecipeTab t={t} setActiveTab={setActiveTab} setChatInput={setChatInput} setAttachedRecipe={setAttachedRecipe} setIsModalOpen={setIsModalOpen} darkMode={darkMode} setDarkMode={setDarkMode} navigate={navigate} />}
        {activeTab === 'mealplan' && <MealPlanTab t={t} setIsModalOpen={setIsModalOpen} darkMode={darkMode} setDarkMode={setDarkMode} navigate={navigate} />}
        {activeTab === 'chat' && <ChatTab t={t} chatInput={chatInput} setChatInput={setChatInput} attachedRecipe={attachedRecipe} setAttachedRecipe={setAttachedRecipe} setIsModalOpen={setIsModalOpen} darkMode={darkMode} setDarkMode={setDarkMode} navigate={navigate} />}
        </div>
        </div>

        {/* Bottom Bar - Döljs vid modal */}
        {!isModalOpen && (
            <div className={clsx("fixed bottom-0 left-0 right-0 border-t backdrop-blur-xl z-10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 pb-safe", t.navBg, t.border)}>
            <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
            <button onClick={() => setActiveTab('pantry')} className={clsx("flex-1 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'pantry' ? t.activeTabBg : "text-slate-400 hover:text-slate-500")}>
            <List className="w-5 h-5" />
            <span className="text-[10px] font-bold">Lagring</span>
            </button>
            <button onClick={() => setActiveTab('shopping')} className={clsx("flex-1 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'shopping' ? t.activeTabBg : "text-slate-400 hover:text-slate-500")}>
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[10px] font-bold">Inköp</span>
            </button>
            <button onClick={() => setActiveTab('recipes')} className={clsx("flex-1 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'recipes' ? t.activeTabBg : "text-slate-400 hover:text-slate-500")}>
            <ChefHat className="w-5 h-5" />
            <span className="text-[10px] font-bold">Recept</span>
            </button>
            <button onClick={() => setActiveTab('mealplan')} className={clsx("flex-1 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'mealplan' ? t.activeTabBg : "text-slate-400 hover:text-slate-500")}>
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-bold">Vecka</span>
            </button>
            <button onClick={() => setActiveTab('chat')} className={clsx("flex-1 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'chat' ? t.activeTabBg : "text-slate-400 hover:text-slate-500")}>
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-bold">Chatt</span>
            </button>
            </div>
            </div>
        )}
        </div>
    );
};

export const NanoView = () => (
    <PantryProvider>
    <SmartPantryShell />
    </PantryProvider>
);
