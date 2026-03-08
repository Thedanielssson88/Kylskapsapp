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
        bg: 'bg-[#121212]', bgAlt: 'bg-[#1E1E1E]', bgInput: 'bg-[#2A2A2A]',
        border: 'border-white/5', text: 'text-[#F7F4EB]', textMuted: 'text-[#A9B8A2]', textWhite: 'text-white',
        cardBg: 'bg-[#1E1E1E] shadow-xl', btnPrimary: 'bg-[#C48B71] hover:bg-[#b57d63] text-white shadow-lg',
        btnGhost: 'hover:bg-white/5 text-gray-300', navBg: 'bg-[#1E1E1E]/90', activeTabBg: 'bg-[#A9B8A2] text-white'
    } : {
        bg: 'bg-[#F7F4EB]', bgAlt: 'bg-white', bgInput: 'bg-gray-50',
        border: 'border-black/5', text: 'text-[#2D2D2D]', textMuted: 'text-[#7A7A7A]', textWhite: 'text-white',
        cardBg: 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]', 
        btnPrimary: 'bg-[#C48B71] hover:bg-[#b57d63] text-white shadow-md',
        btnGhost: 'hover:bg-[#E8E5DC] text-[#2D2D2D]', navBg: 'bg-white/90', 
        activeTabBg: 'bg-[#2D2D2D] text-white' 
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

        {/* Ny svävande Premium Bottom Nav */}
        {!isModalOpen && (
            <div className="fixed bottom-6 left-4 right-4 z-10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-8">
            <div className={clsx("flex items-center justify-between px-2 py-2 max-w-md mx-auto rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl border", t.navBg, t.border)}>
            
            <button onClick={() => setActiveTab('pantry')} className={clsx("flex-1 py-3 px-2 rounded-full flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'pantry' ? t.activeTabBg : "text-[#7A7A7A] hover:text-[#2D2D2D] dark:hover:text-white")}>
            <List className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">Lagring</span>
            </button>
            
            <button onClick={() => setActiveTab('shopping')} className={clsx("flex-1 py-3 px-2 rounded-full flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'shopping' ? t.activeTabBg : "text-[#7A7A7A] hover:text-[#2D2D2D] dark:hover:text-white")}>
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">Inköp</span>
            </button>
            
            <button onClick={() => setActiveTab('recipes')} className={clsx("flex-1 py-3 px-2 rounded-full flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'recipes' ? t.activeTabBg : "text-[#7A7A7A] hover:text-[#2D2D2D] dark:hover:text-white")}>
            <ChefHat className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">Recept</span>
            </button>
            
            <button onClick={() => setActiveTab('mealplan')} className={clsx("flex-1 py-3 px-2 rounded-full flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'mealplan' ? t.activeTabBg : "text-[#7A7A7A] hover:text-[#2D2D2D] dark:hover:text-white")}>
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">Vecka</span>
            </button>
            
            <button onClick={() => setActiveTab('chat')} className={clsx("flex-1 py-3 px-2 rounded-full flex flex-col items-center gap-1 transition-all active:scale-95", activeTab === 'chat' ? t.activeTabBg : "text-[#7A7A7A] hover:text-[#2D2D2D] dark:hover:text-white")}>
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">Chatt</span>
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
