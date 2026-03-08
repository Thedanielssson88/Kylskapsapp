import React, { useState, useRef } from 'react';
import { Camera, Plus, Edit2, CheckCircle2, Paperclip, RefreshCw, Sun, Moon, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { usePantry } from '../../context/PantryContext';
import { callAI } from '../../services/aiService';

const CATEGORIES = ["Mejeri & Ägg", "Kött & Fågel", "Frukt & Grönt", "Skafferivaror", "Bröd & Spannmål", "Kylvaror", "Frysvaror", "Övrigt"];

export const PantryTab = ({ t, setIsModalOpen, darkMode, setDarkMode, navigate }: { t: any, setIsModalOpen: any, darkMode: boolean, setDarkMode: (val: boolean) => void, navigate: any }) => {
    const { ingredients, saveIngredient, isWorking, setIsWorking, setLoadingMessage } = usePantry();
    const [locations, setLocations] = useState<string[]>(() => JSON.parse(localStorage.getItem('PANTRY_LOCATIONS') || '["Kylskåp", "Frys", "Skafferi"]'));
    const [activeLocation, setActiveLocation] = useState<string>(locations[0]);
    const [manualIngredient, setManualIngredient] = useState('');
    const [editingIngredient, setEditingIngredient] = useState<any | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showImageSourceModal, setShowImageSourceModal] = useState(false);
    const [scanResult, setScanResult] = useState<{added: string[], existing: string[]} | null>(null);

    const getServerUrl = () => localStorage.getItem('NANO_SERVER_URL') || 'http://192.168.50.185:8000';

    const processImage = async (file: File) => {
        setPreviewImage(URL.createObjectURL(file));
        setIsWorking(true);
        setLoadingMessage(`Analyserar bild för ${activeLocation}...`);

        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const base64DataUrl = await base64Promise;

            let parsed: any[] | null = null;
            try {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('location', activeLocation);
                const res = await fetch(`${getServerUrl()}/api/upload`, { method: 'POST', body: formData });
                if (res.ok) {
                    const data = await res.json();
                    parsed = data.items;
                }
            } catch (backendError) {
                console.warn('Backend inte tillgänglig, använder direkt AI-analys:', backendError);
            }

            if (!parsed) {
                const selectedModel = localStorage.getItem('NANO_MODEL') || 'claude';
                const prompt = `Analysera denna bild av ett förvaringsutrymme. Identifiera alla matvaror du kan se.
                Du MÅSTE svara exakt med en JSON-array. Inga andra meningar.
                Varje objekt ska ha "name" (svenska) och "category" (välj en av: ${CATEGORIES.join(', ')}).
                Exempel: [{"name": "Mjölk", "category": "Mejeri & Ägg"}]`;

                if (selectedModel === 'gemini') {
                    const geminiApiKey = localStorage.getItem('GEMINI_API_KEY');
                    const geminiModelId = localStorage.getItem('NANO_GEMINI_MODEL_ID') || 'gemini-2.0-flash-exp';
                    if (!geminiApiKey) throw new Error('Gemini API-nyckel saknas');

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModelId}:generateContent?key=${geminiApiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: prompt },
                                    { inline_data: { mime_type: file.type, data: base64DataUrl.split(',')[1] } }
                                ]
                            }]
                        })
                    });

                    if (!response.ok) throw new Error('Gemini API-fel');
                    const data = await response.json();
                    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
                    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
                } else if (selectedModel === 'claude-api') {
                    const claudeApiKey = localStorage.getItem('CLAUDE_API_KEY');
                    const claudeModelId = localStorage.getItem('NANO_CLAUDE_MODEL_ID') || 'claude-sonnet-4-6';
                    if (!claudeApiKey) throw new Error('Claude API-nyckel saknas');

                    const response = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': claudeApiKey,
                            'anthropic-version': '2023-06-01',
                            'anthropic-dangerous-direct-browser-access': 'true'
                        },
                        body: JSON.stringify({
                            model: claudeModelId,
                            max_tokens: 1024,
                            messages: [{
                                role: 'user',
                                content: [
                                    { type: 'image', source: { type: 'base64', media_type: file.type, data: base64DataUrl.split(',')[1] } },
                                             { type: 'text', text: prompt }
                                ]
                            }]
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(`Claude API-fel (${response.status}): ${errorData.error?.message || 'Okänt fel'}`);
                    }

                    const data = await response.json();
                    const aiResponse = data.content?.[0]?.text || '';
                    const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
                    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
                } else if (selectedModel === 'openrouter') {
                    const openRouterApiKey = localStorage.getItem('NANO_OPENROUTER_API_KEY');
                    const openRouterModelId = localStorage.getItem('NANO_OPENROUTER_MODEL_ID') || 'anthropic/claude-3.5-sonnet';
                    if (!openRouterApiKey) throw new Error('OpenRouter API-nyckel saknas');

                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${openRouterApiKey}`,
                            'HTTP-Referer': window.location.origin,
                            'X-Title': 'Kylskåpsapp'
                        },
                        body: JSON.stringify({
                            model: openRouterModelId,
                            messages: [{
                                role: 'user',
                                content: [
                                    { type: 'image_url', image_url: { url: base64DataUrl } },
                                    { type: 'text', text: prompt }
                                ]
                            }]
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(`OpenRouter API-fel (${response.status}): ${errorData.error?.message || 'Okänt fel'}`);
                    }

                    const data = await response.json();
                    const aiResponse = data.choices?.[0]?.message?.content || '';
                    const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
                    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Endast Claude API, Gemini och OpenRouter stöds för bildanalys utan backend');
                }
            }

            if (!parsed || parsed.length === 0) throw new Error('Kunde inte identifiera några matvaror');

            const currentAreaIngredients = ingredients.filter(i => (i.location || 'Kylskåp') === activeLocation);
            const addedItems: string[] = [];
            const existingItems: string[] = [];

            for (const item of parsed) {
                if (!currentAreaIngredients.some(existing => existing.name.toLowerCase() === item.name.toLowerCase())) {
                    await saveIngredient({
                        id: Date.now().toString() + Math.random(),
                                         name: item.name,
                                         category: item.category || 'Övrigt',
                                         source: 'scanned',
                                         location: activeLocation
                    });
                    addedItems.push(item.name);
                } else {
                    existingItems.push(item.name);
                }
            }

            setScanResult({ added: addedItems, existing: existingItems });

        } catch (error) {
            console.error(error);
            alert(`Kunde inte analysera bilden: ${error instanceof Error ? error.message : 'Okänt fel'}`);
        } finally {
            setIsWorking(false);
            setPreviewImage(null);
        }
    };

    const handleTakePhoto = () => {
        setShowImageSourceModal(false);
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment' as any;
        input.onchange = async (e: any) => { const file = e.target.files?.[0]; if (file) await processImage(file); };
        input.click();
    };

    const handleChooseFromGallery = () => {
        setShowImageSourceModal(false);
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => { const file = e.target.files?.[0]; if (file) await processImage(file); };
        input.click();
    };

    const activeIngredients = ingredients.filter(ing => (ing.location || 'Kylskåp') === activeLocation);
    const groupedIngredients = activeIngredients.reduce((acc, ing) => {
        const cat = ing.category || 'Övrigt';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ing);
        return acc;
    }, {} as Record<string, typeof activeIngredients>);

    return (
        <div className="pb-20">
        {previewImage && isWorking && (
            <img src={previewImage} className="fixed inset-0 w-full h-full object-cover opacity-20 z-40 pointer-events-none" alt="Scanning" />
        )}

        {/* Ny ren Hero Header */}
        <div className="relative pt-12 pb-6 px-6">
        <div className="absolute top-4 right-4 flex items-center gap-2">
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-[#7A7A7A] hover:bg-[#E8E5DC] transition-all">
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button onClick={() => navigate('/settings')} className="p-2 rounded-full text-[#7A7A7A] hover:bg-[#E8E5DC] transition-all">
        <Settings className="w-5 h-5" />
        </button>
        </div>
        <h1 className="text-3xl font-semibold text-[#2D2D2D] mb-1 tracking-tight">Lagring & Inventering</h1>
        <p className="text-[#7A7A7A] text-sm font-medium">Kylskåp, frys och skafferi</p>
        </div>

        <div className="px-4 space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {locations.map(loc => (
            <button key={loc} onClick={() => setActiveLocation(loc)} className={clsx("px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all", activeLocation === loc ? "bg-[#E3EAE0] text-[#2D2D2D]" : "bg-transparent text-[#7A7A7A] border border-[#E0E0E0]")}>{loc}</button>
        ))}
        <button onClick={() => { const name = prompt("Ny plats:"); if(name) { setLocations([...locations, name]); setActiveLocation(name); } }} className={clsx("p-2 rounded-xl border border-dashed opacity-50", t.border)}><Plus className="w-5 h-5" /></button>
        </div>

        <button onClick={() => setShowImageSourceModal(true)} className={clsx("w-full py-4 rounded-2xl shadow-md flex items-center justify-center gap-3 active:scale-95 transition-transform", t.btnPrimary)}>
        <Camera className="w-6 h-6" /> <span className="font-bold">Fota {activeLocation}</span>
        </button>

        <div className={clsx("rounded-2xl p-4 shadow-sm border", t.cardBg, t.border)}>
        <div className="flex gap-2 mb-4">
        <input type="text" value={manualIngredient} onChange={e => setManualIngredient(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveIngredient({ id: Date.now().toString(), name: manualIngredient, source: 'manual', location: activeLocation, category: 'Övrigt' }).then(()=>setManualIngredient(''))} placeholder="Lägg till manuellt..." className={clsx("flex-1 px-5 py-3.5 rounded-2xl text-[15px] outline-none transition-all", t.bgInput)} />
        <button onClick={() => saveIngredient({ id: Date.now().toString(), name: manualIngredient, source: 'manual', location: activeLocation, category: 'Övrigt' }).then(()=>setManualIngredient(''))} className={clsx("px-5 rounded-2xl font-bold shadow-sm transition-transform active:scale-95", t.btnPrimary)}><Plus className="w-5 h-5"/></button>
        </div>

        {Object.keys(groupedIngredients).length === 0 ? (
            <p className="text-sm italic opacity-50 py-4 text-center">Inget här ännu.</p>
        ) : (
            Object.entries(groupedIngredients).map(([category, items]) => (
                <div key={category} className="mb-4 last:mb-0">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-purple-500 mb-2">{category}</h3>
                <div className="flex flex-col gap-2">
                {items.map(ing => (
                    <div key={ing.id} onClick={() => { setEditingIngredient(ing); setIsModalOpen(true); }} className={clsx("flex flex-col px-3 py-2 rounded-xl border cursor-pointer hover:border-purple-500/50 transition-colors", ing.source === 'scanned' ? 'bg-purple-500/5 border-purple-500/20' : t.bgInput)}>
                    <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{ing.name}</span>
                    <span className="text-xs opacity-50 flex items-center gap-1"><Edit2 className="w-3 h-3"/></span>
                    </div>
                    {(ing.quantity || ing.expiry) && (
                        <div className="flex gap-3 mt-1 text-[10px] opacity-70 font-mono">
                        {ing.quantity && <span>Mängd: {ing.quantity}</span>}
                        {ing.expiry && <span className={new Date(ing.expiry) < new Date() ? "text-red-500 font-bold" : ""}>Utgång: {ing.expiry}</span>}
                        </div>
                    )}
                    </div>
                ))}
                </div>
                </div>
            ))
        )}
        </div>

        {/* Scan Result Modal */}
        {scanResult && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
            <div className={clsx("rounded-2xl p-6 max-w-sm w-full", t.cardBg, t.border, "border")}>
            <h3 className="text-xl font-bold mb-4">Skanning klar!</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {scanResult.added.length > 0 && (
                <div>
                <h4 className="font-bold text-green-500 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Nya varor inlagda
                </h4>
                <ul className="space-y-1 text-sm">
                {scanResult.added.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>{item}</li>
                ))}
                </ul>
                </div>
            )}
            {scanResult.existing.length > 0 && (
                <div>
                <h4 className="font-bold text-gray-400 mb-2 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" /> Redan inlagda
                </h4>
                <ul className="space-y-1 text-sm opacity-70">
                {scanResult.existing.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>{item}</li>
                ))}
                </ul>
                </div>
            )}
            {scanResult.added.length === 0 && scanResult.existing.length === 0 && (
                <p className="text-sm opacity-70 italic">Inga varor kunde identifieras.</p>
            )}
            </div>
            <button onClick={() => setScanResult(null)} className={clsx("w-full mt-6 py-3 rounded-xl font-bold", t.btnPrimary)}>Okej</button>
            </div>
            </div>
        )}

        {/* Edit Ingredient Modal */}
        {editingIngredient && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={clsx("rounded-2xl p-6 max-w-md w-full", t.bgAlt)}>
            <h3 className="text-xl font-bold mb-4">Redigera ingrediens</h3>
            <div className="space-y-4">
                <div>
                    <label className="text-sm opacity-70 block mb-2">Namn</label>
                    <input
                        type="text"
                        value={editingIngredient.name}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, name: e.target.value })}
                        className={clsx("w-full px-4 py-3 rounded-xl border", t.bgInput, t.border)}
                    />
                </div>
                <div>
                    <label className="text-sm opacity-70 block mb-2">Mängd (t.ex. 500 g, 2 st)</label>
                    <input
                        type="text"
                        value={editingIngredient.quantity || ''}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, quantity: e.target.value })}
                        placeholder="Frivillig"
                        className={clsx("w-full px-4 py-3 rounded-xl border", t.bgInput, t.border)}
                    />
                </div>
                <div>
                    <label className="text-sm opacity-70 block mb-2">Kategori</label>
                    <select
                        value={editingIngredient.category}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, category: e.target.value })}
                        className={clsx("w-full px-4 py-3 rounded-xl border", t.bgInput, t.border)}
                    >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm opacity-70 block mb-2">Plats</label>
                    <select
                        value={editingIngredient.location || activeLocation}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, location: e.target.value })}
                        className={clsx("w-full px-4 py-3 rounded-xl border", t.bgInput, t.border)}
                    >
                        {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                </div>
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => {
                            saveIngredient(editingIngredient);
                            setEditingIngredient(null);
                            setIsModalOpen(false);
                        }}
                        className={clsx("flex-1 py-3 rounded-xl font-bold", t.btnPrimary)}
                    >
                        Spara
                    </button>
                    <button
                        onClick={() => { setEditingIngredient(null); setIsModalOpen(false); }}
                        className="flex-1 py-3 rounded-xl font-semibold bg-[#A9B8A2] hover:bg-[#98A791] text-white"
                    >
                        Avbryt
                    </button>
                </div>
            </div>
            </div>
            </div>
        )}

        {/* Image Source Modal */}
        {showImageSourceModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={clsx("rounded-2xl p-6 max-w-sm w-full", t.bgAlt)}>
            <h3 className="text-xl font-bold mb-4">Välj bildkälla</h3>
            <div className="space-y-3">
            <button onClick={handleTakePhoto} className={clsx("w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3", t.btnPrimary)}>
            <Camera className="w-5 h-5" /> Ta foto
            </button>
            <button onClick={handleChooseFromGallery} className={clsx("w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3", t.btnPrimary, "bg-gray-600 hover:bg-gray-500")}>
            <Paperclip className="w-5 h-5" /> Välj från galleri
            </button>
            <button onClick={() => setShowImageSourceModal(false)} className="w-full py-3 text-sm opacity-60 hover:opacity-100">Avbryt</button>
            </div>
            </div>
            </div>
        )}
        </div>
        </div>
    );
};
