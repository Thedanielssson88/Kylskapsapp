import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Key, Plus, Trash2, Cpu, Globe } from 'lucide-react';
import { clsx } from 'clsx';

const defaultGemini = [
  { name: 'Gemini 2.0 Flash (Snabbast)', id: 'gemini-2.0-flash-exp' },
  { name: 'Gemini 1.5 Flash', id: 'gemini-1.5-flash' },
{ name: 'Gemini 1.5 Pro (Smartast)', id: 'gemini-1.5-pro' }
];

const defaultOpenRouter = [
  { name: 'DeepSeek Chat', id: 'deepseek/deepseek-chat' },
{ name: 'Claude 3.5 Sonnet', id: 'anthropic/claude-3.5-sonnet' },
{ name: 'GPT-4o', id: 'openai/gpt-4o' }
];

const defaultClaude = [
  { name: 'Claude Sonnet 4.6', id: 'claude-sonnet-4-6' },
{ name: 'Claude Opus 4.6', id: 'claude-opus-4-6' },
{ name: 'Claude Haiku 4.5', id: 'claude-haiku-4-5-20251001' }
];

export const SettingsView = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('NANO_DARK_MODE') !== 'false');

  // AI Provider Settings
  const [nanoModel, setNanoModel] = useState<'claude-api' | 'claude-nanoclaw' | 'gemini' | 'openrouter'>('gemini');

  // API Keys
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');

  // Server URLs
  const [nanoServerUrl, setNanoServerUrl] = useState('');

  // Model Lists
  const [claudeModels, setClaudeModels] = useState<{name: string, id: string}[]>([]);
  const [geminiModels, setGeminiModels] = useState<{name: string, id: string}[]>([]);
  const [openRouterModels, setOpenRouterModels] = useState<{name: string, id: string}[]>([]);

  // Selected Models
  const [selectedClaudeModel, setSelectedClaudeModel] = useState('');
  const [selectedGeminiModel, setSelectedGeminiModel] = useState('');
  const [selectedOpenRouterModel, setSelectedOpenRouterModel] = useState('');

  // Model Management UI
  const [showModelPopup, setShowModelPopup] = useState<{provider: 'claude'|'gemini'|'openrouter'} | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [newModelId, setNewModelId] = useState('');

  // Samma mjuka färgpalett som huvudvyn
  const t = useMemo(() => darkMode ? {
    bg: 'bg-slate-950', bgAlt: 'bg-slate-900', text: 'text-slate-100', textMuted: 'text-slate-400',
    border: 'border-slate-800', input: 'bg-slate-950 border-slate-700 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all',
    card: 'bg-slate-900 border-slate-800 shadow-md rounded-2xl p-5', button: 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_4px_20px_rgb(124,58,237,0.3)] active:scale-95 transition-all'
  } : {
    bg: 'bg-slate-50', bgAlt: 'bg-white', text: 'text-slate-900', textMuted: 'text-slate-500',
    border: 'border-slate-200/60', input: 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all',
    card: 'bg-white border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-5', button: 'bg-violet-600 hover:bg-violet-700 text-white shadow-[0_4px_20px_rgb(124,58,237,0.25)] active:scale-95 transition-all'
  }, [darkMode]);

  useEffect(() => {
    setNanoModel((localStorage.getItem('NANO_MODEL') as any) || 'gemini');
    setClaudeApiKey(localStorage.getItem('CLAUDE_API_KEY') || '');
    setGeminiApiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    setOpenRouterApiKey(localStorage.getItem('NANO_OPENROUTER_API_KEY') || '');
    setNanoServerUrl(localStorage.getItem('NANO_SERVER_URL') || 'http://192.168.50.185:8000');

    const loadedClaude = localStorage.getItem('CLAUDE_MODELS_LIST');
    setClaudeModels(loadedClaude ? JSON.parse(loadedClaude) : defaultClaude);
    setSelectedClaudeModel(localStorage.getItem('NANO_CLAUDE_MODEL_ID') || 'claude-sonnet-4-6');

    const loadedGemini = localStorage.getItem('GEMINI_MODELS_LIST');
    setGeminiModels(loadedGemini ? JSON.parse(loadedGemini) : defaultGemini);
    setSelectedGeminiModel(localStorage.getItem('NANO_GEMINI_MODEL_ID') || 'gemini-2.0-flash-exp');

    const loadedOR = localStorage.getItem('OPENROUTER_MODELS_LIST');
    setOpenRouterModels(loadedOR ? JSON.parse(loadedOR) : defaultOpenRouter);
    setSelectedOpenRouterModel(localStorage.getItem('NANO_OPENROUTER_MODEL_ID') || 'deepseek/deepseek-chat');
  }, []);

  const handleSave = () => {
    localStorage.setItem('NANO_MODEL', nanoModel);
    localStorage.setItem('CLAUDE_API_KEY', claudeApiKey);
    localStorage.setItem('GEMINI_API_KEY', geminiApiKey);
    localStorage.setItem('NANO_OPENROUTER_API_KEY', openRouterApiKey);
    localStorage.setItem('NANO_SERVER_URL', nanoServerUrl);
    localStorage.setItem('NANO_CLAUDE_MODEL_ID', selectedClaudeModel);
    localStorage.setItem('NANO_GEMINI_MODEL_ID', selectedGeminiModel);
    localStorage.setItem('NANO_OPENROUTER_MODEL_ID', selectedOpenRouterModel);
    localStorage.setItem('CLAUDE_MODELS_LIST', JSON.stringify(claudeModels));
    localStorage.setItem('GEMINI_MODELS_LIST', JSON.stringify(geminiModels));
    localStorage.setItem('OPENROUTER_MODELS_LIST', JSON.stringify(openRouterModels));

    // Använd native-toast bibliotek om du har, annars alert
    alert('Inställningar sparade!');
    navigate(-1);
  };

  const addModel = () => {
    if (!newModelName.trim() || !newModelId.trim() || !showModelPopup) return;

    const newModel = { name: newModelName.trim(), id: newModelId.trim() };

    if (showModelPopup.provider === 'claude') {
      setClaudeModels(prev => [...prev, newModel]);
      setSelectedClaudeModel(newModel.id);
    } else if (showModelPopup.provider === 'gemini') {
      setGeminiModels(prev => [...prev, newModel]);
      setSelectedGeminiModel(newModel.id);
    } else if (showModelPopup.provider === 'openrouter') {
      setOpenRouterModels(prev => [...prev, newModel]);
      setSelectedOpenRouterModel(newModel.id);
    }

    setNewModelName('');
    setNewModelId('');
    setShowModelPopup(null);
  };

  const removeModel = (provider: 'claude'|'gemini'|'openrouter', idToRemove: string) => {
    if (provider === 'claude') {
      const updated = claudeModels.filter(m => m.id !== idToRemove);
      setClaudeModels(updated);
      if (selectedClaudeModel === idToRemove) setSelectedClaudeModel(updated.length > 0 ? updated[0].id : '');
    } else if (provider === 'gemini') {
      const updated = geminiModels.filter(m => m.id !== idToRemove);
      setGeminiModels(updated);
      if (selectedGeminiModel === idToRemove) setSelectedGeminiModel(updated.length > 0 ? updated[0].id : '');
    } else if (provider === 'openrouter') {
      const updated = openRouterModels.filter(m => m.id !== idToRemove);
      setOpenRouterModels(updated);
      if (selectedOpenRouterModel === idToRemove) setSelectedOpenRouterModel(updated.length > 0 ? updated[0].id : '');
    }
  };

  return (
    <div className={clsx("min-h-screen pb-12 font-sans", t.bg, t.text)}>
    {/* Snygg, blurrad header */}
    <div className={clsx("sticky top-0 z-50 border-b backdrop-blur-md bg-white/80 dark:bg-slate-950/80", t.border)}>
    <div className="flex items-center gap-3 p-4 pt-10">
    <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors active:scale-95">
    <ArrowLeft className="w-6 h-6" />
    </button>
    <h1 className="font-extrabold tracking-tight text-xl">Inställningar</h1>
    </div>
    </div>

    <div className="p-5 max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

    {/* AI Provider Selection */}
    <div className={clsx("border", t.card)}>
    <h2 className="font-extrabold text-lg mb-4 flex items-center gap-2">
    <Cpu className="w-5 h-5 text-violet-500" /> Välj Intelligens
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {[
      { id: 'claude-api', label: 'Claude (API)' },
          { id: 'claude-nanoclaw', label: 'Claude (Nanoclaw)' },
          { id: 'gemini', label: 'Gemini (Google)' },
          { id: 'openrouter', label: 'OpenRouter' }
    ].map(provider => (
      <label key={provider.id} className={clsx("flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98]", nanoModel === provider.id ? "bg-violet-50 border-violet-500 dark:bg-violet-500/10 dark:border-violet-500" : "bg-transparent border-slate-200 dark:border-slate-700 hover:border-violet-300")}>
      <input type="radio" className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300" checked={nanoModel === provider.id} onChange={() => setNanoModel(provider.id as any)} />
      <span className={clsx("font-bold text-sm", nanoModel === provider.id ? "text-violet-700 dark:text-violet-400" : "")}>{provider.label}</span>
      </label>
    ))}
    </div>
    </div>

    {/* Claude API Settings */}
    {nanoModel === 'claude-api' && (
      <div className={clsx("border", t.card, "animate-in fade-in duration-300")}>
      <h2 className="font-extrabold text-lg mb-4">Claude API (Direkt)</h2>
      <div className="space-y-4">
      <div>
      <label className={clsx("text-xs font-bold uppercase tracking-wider", t.textMuted)}>API-nyckel</label>
      <input
      type="password"
      value={claudeApiKey}
      onChange={e => setClaudeApiKey(e.target.value)}
      placeholder="sk-ant-..."
      className={clsx("w-full px-4 py-3 rounded-xl border mt-1.5", t.input)}
      />
      </div>
      <div>
      <div className="flex items-center justify-between mb-2">
      <label className={clsx("text-xs font-bold uppercase tracking-wider", t.textMuted)}>Välj Modell</label>
      <button onClick={() => setShowModelPopup({provider: 'claude'})} className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 hover:underline">
      <Plus className="w-3 h-3" /> Lägg till
      </button>
      </div>
      <select value={selectedClaudeModel} onChange={e => setSelectedClaudeModel(e.target.value)} className={clsx("w-full px-4 py-3 rounded-xl border appearance-none font-medium", t.input)}>
      {claudeModels.map(m => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
      </select>
      <div className="mt-3 grid gap-2">
      {claudeModels.map(m => (
        <div key={m.id} className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700">
        <span className="font-medium">{m.name}</span>
        <button onClick={() => removeModel('claude', m.id)} className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
        <Trash2 className="w-4 h-4" />
        </button>
        </div>
      ))}
      </div>
      </div>
      </div>
      </div>
    )}

    {/* Claude Nanoclaw Settings */}
    {nanoModel === 'claude-nanoclaw' && (
      <div className={clsx("border", t.card, "animate-in fade-in duration-300")}>
      <h2 className="font-extrabold text-lg mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-violet-500"/> Nanoclaw Backend</h2>
      <div className="space-y-4">
      <div>
      <label className={clsx("text-xs font-bold uppercase tracking-wider", t.textMuted)}>Server URL</label>
      <input
      type="text"
      value={nanoServerUrl}
      onChange={e => setNanoServerUrl(e.target.value)}
      placeholder="http://192.168.50.185:8000"
      className={clsx("w-full px-4 py-3 rounded-xl border mt-1.5", t.input)}
      />
      <p className={clsx("text-[11px] mt-2 font-medium", t.textMuted)}>
      Den lokala nätverksadressen till din server.
      </p>
      </div>
      </div>
      </div>
    )}

    {/* Gemini Settings */}
    {nanoModel === 'gemini' && (
      <div className={clsx("border", t.card, "animate-in fade-in duration-300")}>
      <h2 className="font-extrabold text-lg mb-4">Gemini API</h2>
      <div className="space-y-4">
      <div>
      <label className={clsx("text-xs font-bold uppercase tracking-wider", t.textMuted)}>API-nyckel</label>
      <input
      type="password"
      value={geminiApiKey}
      onChange={e => setGeminiApiKey(e.target.value)}
      placeholder="AIza..."
      className={clsx("w-full px-4 py-3 rounded-xl border mt-1.5", t.input)}
      />
      </div>
      <div>
      <div className="flex items-center justify-between mb-2">
      <label className={clsx("text-xs font-bold uppercase tracking-wider", t.textMuted)}>Välj Modell</label>
      <button onClick={() => setShowModelPopup({provider: 'gemini'})} className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 hover:underline">
      <Plus className="w-3 h-3" /> Lägg till
      </button>
      </div>
      <select value={selectedGeminiModel} onChange={e => setSelectedGeminiModel(e.target.value)} className={clsx("w-full px-4 py-3 rounded-xl border appearance-none font-medium", t.input)}>
      {geminiModels.map(m => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
      </select>
      <div className="mt-3 grid gap-2">
      {geminiModels.map(m => (
        <div key={m.id} className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700">
        <span className="font-medium">{m.name}</span>
        <button onClick={() => removeModel('gemini', m.id)} className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
        <Trash2 className="w-4 h-4" />
        </button>
        </div>
      ))}
      </div>
      </div>
      </div>
      </div>
    )}

    {/* OpenRouter Settings */}
    {nanoModel === 'openrouter' && (
      <div className={clsx("border", t.card, "animate-in fade-in duration-300")}>
      <h2 className="font-extrabold text-lg mb-4">OpenRouter API</h2>
      <div className="space-y-4">
      <div>
      <label className={clsx("text-xs font-bold uppercase tracking-wider", t.textMuted)}>API-nyckel</label>
      <input
      type="password"
      value={openRouterApiKey}
      onChange={e => setOpenRouterApiKey(e.target.value)}
      placeholder="sk-or-..."
      className={clsx("w-full px-4 py-3 rounded-xl border mt-1.5", t.input)}
      />
      </div>
      <div>
      <div className="flex items-center justify-between mb-2">
      <label className={clsx("text-xs font-bold uppercase tracking-wider", t.textMuted)}>Välj Modell</label>
      <button onClick={() => setShowModelPopup({provider: 'openrouter'})} className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 hover:underline">
      <Plus className="w-3 h-3" /> Lägg till
      </button>
      </div>
      <select value={selectedOpenRouterModel} onChange={e => setSelectedOpenRouterModel(e.target.value)} className={clsx("w-full px-4 py-3 rounded-xl border appearance-none font-medium", t.input)}>
      {openRouterModels.map(m => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
      </select>
      <div className="mt-3 grid gap-2">
      {openRouterModels.map(m => (
        <div key={m.id} className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700">
        <span className="font-medium">{m.name}</span>
        <button onClick={() => removeModel('openrouter', m.id)} className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
        <Trash2 className="w-4 h-4" />
        </button>
        </div>
      ))}
      </div>
      </div>
      </div>
      </div>
    )}

    {/* Spara Knapp */}
    <button
    onClick={handleSave}
    className={clsx("w-full py-4 mt-8 rounded-2xl font-bold flex items-center justify-center gap-2", t.button)}
    >
    <Save className="w-5 h-5" /> Spara Inställningar
    </button>
    </div>

    {/* Snygg Modal för att lägga till modell */}
    {showModelPopup && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className={clsx("rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200", t.bgAlt)}>
      <h3 className="font-extrabold text-xl mb-6">Ny {showModelPopup.provider === 'claude' ? 'Claude' : showModelPopup.provider === 'gemini' ? 'Gemini' : 'OpenRouter'}-modell</h3>
      <div className="space-y-4">
      <div>
      <label className={clsx("text-xs font-bold uppercase tracking-wider", t.textMuted)}>Visningsnamn</label>
      <input
      type="text"
      value={newModelName}
      onChange={e => setNewModelName(e.target.value)}
      placeholder="t.ex. Sonnet 3.5"
      className={clsx("w-full px-4 py-3 rounded-xl border mt-1.5", t.input)}
      />
      </div>
      <div>
      <label className={clsx("text-xs font-bold uppercase tracking-wider", t.textMuted)}>Tekniskt ID</label>
      <input
      type="text"
      value={newModelId}
      onChange={e => setNewModelId(e.target.value)}
      placeholder="claude-3-5-sonnet..."
      className={clsx("w-full px-4 py-3 rounded-xl border mt-1.5 font-mono text-sm", t.input)}
      />
      </div>
      <div className="flex gap-3 pt-4">
      <button
      onClick={() => setShowModelPopup(null)}
      className="flex-1 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
      >
      Avbryt
      </button>
      <button
      onClick={addModel}
      className={clsx("flex-1 py-3 rounded-xl font-bold flex justify-center items-center", t.button)}
      >
      Lägg till
      </button>
      </div>
      </div>
      </div>
      </div>
    )}
    </div>
  );
};
