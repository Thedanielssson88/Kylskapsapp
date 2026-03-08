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
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [chatInput, setChatInput] = useState('');
    const [attachedRecipe, setAttachedRecipe] = useState(null);

    useEffect(() => { localStorage.setItem('NANO_DARK_MODE', String(darkMode)); }, [darkMode]);

    // ✨ NYTT SCANDI-TEMA ✨
    const t = useMemo(() => darkMode ? {
        bg: 'bg-[#121212]',
        bgAlt: 'bg-[#1C1C1C]',
        bgInput: 'bg-[#262626]',
        border: 'border-[#2E2E2E]',
        text: 'text-[#EBEBEB]',
        textMuted: 'text-[#969696]',
        textWhite: 'text-white',
        cardBg: 'bg-[#1C1C1C] shadow-sm border border-[#2E2E2E]',
        btnPrimary: 'bg-[#627A68] hover:bg-[#4F6354] text-white shadow-sm', // Muted grön för dark mode
        btnGhost: 'hover:bg-[#262626] text-[#A3A3A3]',
        navBg: 'bg-[#121212]/90',
        activeTabBg: 'bg-[#262626] text-[#8DAA94]'
    } : {
        bg: 'bg-[#F7F7F5]', // Varm, havrefärgad bakgrund
        bgAlt: 'bg-white',
        bgInput: 'bg-[#EFEFEA]', // Mycket mjukt grå-beige inmatningsfält
        border: 'border-[#E2E2DC]',
        text: 'text-[#2D2D2A]', // Off-black, mjukare för ögonen
        textMuted: 'text-[#80807B]',
        textWhite: 'text-[#1A1A18]',
        cardBg: 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-[#E2E2DC]/40',
                      btnPrimary: 'bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white shadow-sm', // Klassisk skandinavisk salviagrön
                      btnGhost: 'hover:bg-[#EFEFEA] text-[#5C5C5A]',
                      navBg: 'bg-[#F7F7F5]/85',
                      activeTabBg: 'bg-[#EAECE8] text-[#3B4A3E] shadow-sm' // Ljusgrön bakgrund för aktiv tabb
    }, [darkMode]);

    return (
        <div className={clsx("flex flex-col h-screen overflow-hidden font-sans", t.bg, t.text)}>
        {/* Header - Döljs vid modal */}
        {!isModalOpen && (
            <header className={clsx("px-5 pt-12 pb-4 z-10 flex items-center justify-between sticky top-0 backdrop-blur-md border-b transition-all duration-300 animate-in fade-in slide-in-from-top-4", t.navBg, t.border)}>
            <h1 className={clsx("text-2xl font-bold tracking-tight truncate", t.textWhite)}>Smart Skafferi</h1>
            <div className="flex items-center gap-1.5">
            <button onClick={() => setDarkMode(!darkMode)} className={clsx("p-2.5 rounded-full transition-all active:scale-95", t.btnGhost)}>
            {darkMode ? <Sun className="w-5 h-5 text-[#E6C27A]" /> : <Moon className="w-5 h-5 text-[#4A5D4E]" />}
            </button>
            <button onClick={() => navigate('/settings')} className={clsx("p-2.5 rounded-full transition-all active:scale-95", t.btnGhost)}>
            <Settings className="w-5 h-5" />
            </button>
            </div>
            </header>
        )}

        <div className="flex-1 overflow-y-auto relative z-0 w-full max-w-2xl mx-auto">
        {isWorking && (
            <div className="absolute inset-0 z-[150] bg-[#F7F7F5]/70 dark:bg-[#121212]/70 backdrop-blur-md flex flex-col items-center justify-center transition-all animate-in fade-in duration-300">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#4A5D4E] dark:text-[#8DAA94]" />
            <p className={clsx("font-bold tracking-wider animate-pulse", t.text)}>{loadingMessage}</p>
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
            <button onClick={() => setActiveTab('pantry')} className={clsx("flex-1 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'pantry' ? t.activeTabBg : clsx(t.textMuted, t.btnGhost))}>
            <List className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Lagring</span>
            </button>
            <button onClick={() => setActiveTab('shopping')} className={clsx("flex-1 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'shopping' ? t.activeTabBg : clsx(t.textMuted, t.btnGhost))}>
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Inköp</span>
            </button>
            <button onClick={() => setActiveTab('recipes')} className={clsx("flex-1 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'recipes' ? t.activeTabBg : clsx(t.textMuted, t.btnGhost))}>
            <ChefHat className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Recept</span>
            </button>
            <button onClick={() => setActiveTab('mealplan')} className={clsx("flex-1 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'mealplan' ? t.activeTabBg : clsx(t.textMuted, t.btnGhost))}>
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Vecka</span>
            </button>
            <button onClick={() => setActiveTab('chat')} className={clsx("flex-1 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'chat' ? t.activeTabBg : clsx(t.textMuted, t.btnGhost))}>
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Chatt</span>
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
