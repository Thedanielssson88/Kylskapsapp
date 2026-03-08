import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Volume2, VolumeX, Sun, Moon, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { usePantry } from '../../context/PantryContext';
import { LocalAgentMessage, Recipe } from '../../types/pantry';
import { callAI } from '../../services/aiService';

// Voice Imports (Säkerställ att dessa vägar stämmer med ditt projekt)
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { startRecording, stopRecording } from '../../services/audioRecorder';
import { transcribeBlobAI } from '../../services/geminiService';

interface ChatTabProps {
    t: any;
    chatInput: string;
    setChatInput: (val: string) => void;
    attachedRecipe: Recipe | null;
    setAttachedRecipe: (val: Recipe | null) => void;
    setIsModalOpen: any;
    darkMode: boolean;
    setDarkMode: (val: boolean) => void;
    navigate: any;
}

// Formateringsfunktioner (Markdown)
const inlineMarkdown = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-black/10 dark:bg-black/30 px-1 rounded text-xs font-mono break-all">{part.slice(1, -1)}</code>;
        return part;
    });
};

const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (/^#{1,3}\s/.test(line)) {
            const level = line.match(/^(#+)/)?.[1].length || 1;
            const content = line.replace(/^#+\s/, '');
            const cls = level === 1 ? 'font-bold text-lg mt-3 mb-1 text-purple-600 dark:text-purple-400' : level === 2 ? 'font-bold text-base mt-3 mb-1' : 'font-semibold mt-2';
            elements.push(<div key={i} className={cls}>{inlineMarkdown(content)}</div>);
        } else if (/^[-*•]\s/.test(line)) {
            elements.push(<div key={i} className="flex gap-2 my-1 ml-1"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" /><span>{inlineMarkdown(line.replace(/^[-*•]\s/, ''))}</span></div>);
        } else if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^(\d+)\./)?.[1];
            elements.push(<div key={i} className="flex gap-2 my-1.5 mt-2"><span className="shrink-0 text-purple-500 font-bold">{num}.</span><span>{inlineMarkdown(line.replace(/^\d+\.\s/, ''))}</span></div>);
        } else if (line.trim() === '') {
            elements.push(<div key={i} className="h-2" />);
        } else {
            elements.push(<div key={i} className="my-0.5">{inlineMarkdown(line)}</div>);
        }
        i++;
    }
    return <div className="text-sm leading-relaxed">{elements}</div>;
};

export const ChatTab = ({ t, chatInput, setChatInput, attachedRecipe, setAttachedRecipe, setIsModalOpen, darkMode, setDarkMode, navigate }: ChatTabProps) => {
    const { ingredients, isWorking } = usePantry();
    const [chatMessages, setChatMessages] = useState<LocalAgentMessage[]>([
        { id: '1', role: 'agent', content: 'Hej! Fota dina förvaringsutrymmen så hjälper jag dig att hitta på något gott att äta!', timestamp: Date.now() }
    ]);

    const [inputMode, setInputMode] = useState<'chat' | 'voice'>('chat');
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    // NYTT: State för högtalare
    const [speakerMode, setSpeakerMode] = useState(() => localStorage.getItem('NANO_SPEAKER_MODE') !== 'false');

    const isRecordingRef = useRef(false);
    const speechListenerRef = useRef<any>(null);
    const chatInputRef = useRef(chatInput);

    useEffect(() => { chatInputRef.current = chatInput; }, [chatInput]);
    const isLocalMode = localStorage.getItem('TRANSCRIPTION_MODE') === 'local';

    // NYTT: Spara inställningen och stäng av ljudet direkt om man klickar "Off" medan den pratar
    useEffect(() => {
        localStorage.setItem('NANO_SPEAKER_MODE', String(speakerMode));
        if (!speakerMode) {
            window.speechSynthesis?.cancel();
            TextToSpeech.stop().catch(() => {});
        }
    }, [speakerMode]);

    const speakText = async (text: string, onEnded?: () => void) => {
        const cleanText = text.replace(/[\*\#_`]/g, '').trim();
        if (!cleanText) { if (onEnded) onEnded(); return; }

        try {
            await TextToSpeech.stop().catch(() => {});
            await TextToSpeech.speak({ text: cleanText, lang: 'sv-SE', rate: 1.0, pitch: 1.0 });
            if (onEnded) onEnded();
        } catch (err) {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'sv-SE';
                utterance.onend = () => { if (onEnded) onEnded(); };
                window.speechSynthesis.speak(utterance);
            } else {
                if (onEnded) onEnded();
            }
        }
    };

    const startListening = async () => {
        if (isRecordingRef.current) return;
        setIsRecording(true);
        isRecordingRef.current = true;

        if (isLocalMode) {
            if (speechListenerRef.current) speechListenerRef.current.remove();
            speechListenerRef.current = await SpeechRecognition.addListener('partialResults', (data: any) => {
                if (!isRecordingRef.current) return;
                if (data.matches && data.matches.length > 0) {
                    window.speechSynthesis?.cancel();
                    setChatInput(data.matches[0]);
                }
            });
            await SpeechRecognition.start({ language: 'sv-SE', partialResults: true, popup: false }).catch(() => setIsRecording(false));
        } else {
            await startRecording();
        }
    };

    const stopListening = async () => {
        if (!isRecordingRef.current) return null;
        isRecordingRef.current = false;
        setIsRecording(false);
        if (speechListenerRef.current) speechListenerRef.current.remove();

        if (isLocalMode) {
            await SpeechRecognition.stop().catch(()=>{});
            return null;
        } else {
            return await stopRecording();
        }
    };

    const handleChatSend = async (overrideText?: string) => {
        let textToSend = overrideText || chatInput;
        setChatInput('');
        if (isRecordingRef.current) await stopListening();

        if (!textToSend.trim()) return;

        let displayContent = textToSend;
        if (attachedRecipe) displayContent = `[Recept: ${attachedRecipe.title}]\n${textToSend}`;
        setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: displayContent, timestamp: Date.now() }]);

        const thinkingId = `thinking-${Date.now()}`;
        setChatMessages(prev => [...prev, { id: thinkingId, role: 'agent', content: '...', timestamp: Date.now() }]);

        let context = `[System: Du är en kock-assistent. Användaren har följande hemma: ${ingredients.map(i => i.name).join(', ')}.]`;
        if (attachedRecipe) context += `\n[System: Svara på frågor om receptet: ${attachedRecipe.title} - ${attachedRecipe.instructions}]`;
        if (inputMode === 'voice') context += `\n[System: Voice Mode PÅ. Svara superkort och utan formatering.]`;

        try {
            const aiResponse = await callAI(textToSend, context);
            setChatMessages(prev => [
                ...prev.filter(m => m.id !== thinkingId),
                            { id: Date.now().toString(), role: 'agent', content: aiResponse, timestamp: Date.now() }
            ]);

            if (speakerMode) {
                speakText(aiResponse, () => { if (inputMode === 'voice') setTimeout(() => startListening(), 300); });
            } else if (inputMode === 'voice') {
                setTimeout(() => startListening(), 300);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Kunde inte nå servern.';
            setChatMessages(prev => [
                ...prev.filter(m => m.id !== thinkingId),
                            { id: Date.now().toString(), role: 'agent', content: `⚠️ Ett fel uppstod: ${errorMessage}`, timestamp: Date.now() }
            ]);
        } finally {
            setAttachedRecipe(null);
        }
    };

    const toggleRecording = async () => {
        window.speechSynthesis?.cancel();
        if (isRecordingRef.current) {
            const audioBlob = await stopListening();
            if (isLocalMode) {
                if (chatInputRef.current.trim().length > 0) handleChatSend(chatInputRef.current);
            } else if (audioBlob) {
                setIsTranscribing(true);
                try {
                    const text = await transcribeBlobAI(audioBlob);
                    handleChatSend(text);
                } catch(e) {}
                setIsTranscribing(false);
            }
        } else {
            await startListening();
        }
    };

    return (
        <div className="flex flex-col h-full relative">
        {/* Clean Header */}
        <div className="relative pt-14 pb-4 px-6 flex-shrink-0 z-10 bg-transparent">
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-[#7A7A7A] hover:bg-black/5 transition-all">
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button onClick={() => navigate('/settings')} className="p-2 rounded-full text-[#7A7A7A] hover:bg-black/5 transition-all">
                    <Settings className="w-5 h-5" />
                </button>
            </div>
            <h1 className="text-3xl font-bold text-[#2D2D2D] dark:text-white mb-1 tracking-tight">AI-Kock</h1>
            <p className="text-[#7A7A7A] text-sm font-medium">Din personliga matassistent</p>
        </div>

        {/* Chat Messages - iOS/WhatsApp Style */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 pb-64 bg-transparent">
        {chatMessages.map((msg, idx) => {
            const prevMsg = chatMessages[idx - 1];
            const showTimestamp = !prevMsg || (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 60000);
            const msgTime = new Date(msg.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

            return (
                <div key={msg.id} className="flex flex-col">
                {showTimestamp && (
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                    {new Date(msg.timestamp).toLocaleDateString('sv-SE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
                <div className={clsx("flex items-end gap-2 mb-1", msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                    {msg.role === 'agent' && (
                        <div className="w-8 h-8 rounded-full bg-[#A9B8A2] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mb-1">
                        AI
                        </div>
                    )}
                    <div className={clsx(
                        "max-w-[75%] rounded-[20px] px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E0E0E0]/30",
                        msg.role === 'user'
                            ? "bg-[#C48B71] text-white rounded-br-md shadow-sm" // Terrakotta för användaren
                            : "bg-white dark:bg-slate-800 text-[#2D2D2D] dark:text-slate-100 rounded-bl-md"
                    )}>
                    <div className="text-[15px] leading-relaxed">
                    {msg.role === 'agent' && msg.content === '...' ? (
                        <div className="flex gap-1 py-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                    ) : renderMarkdown(msg.content)}
                    </div>
                    <div className={clsx("text-[11px] mt-1 opacity-60", msg.role === 'user' ? 'text-white/80' : 'text-gray-500')}>
                    {msgTime}
                    </div>
                    </div>
                </div>
                </div>
            );
        })}
        </div>

        {/* Input Area - iOS Style */}
        <div className={clsx("absolute bottom-0 w-full backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-t border-gray-200/50 dark:border-gray-700/50 flex flex-col pb-24 shadow-lg")}>
        {/* Mode Toggle */}
        <div className="flex justify-center items-center gap-2 p-3 relative border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => { setInputMode('chat'); stopListening(); }} className={clsx("px-6 py-2 rounded-full text-xs font-semibold transition-all", inputMode === 'chat' ? "bg-[#A9B8A2] text-white shadow-sm" : "bg-transparent text-[#7A7A7A] border border-[#E0E0E0]")}>
        💬 Chatt
        </button>
        <button onClick={() => { setInputMode('voice'); startListening(); }} className={clsx("px-6 py-2 rounded-full text-xs font-semibold transition-all", inputMode === 'voice' ? "bg-[#A9B8A2] text-white shadow-sm" : "bg-transparent text-[#7A7A7A] border border-[#E0E0E0]")}>
        🎙️ Tala
        </button>
        <button onClick={() => setSpeakerMode(!speakerMode)} className={clsx("absolute right-4 p-2 rounded-full transition-all", speakerMode ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-gray-800 text-gray-400")} title={speakerMode ? "Ljud på" : "Ljud av"}>
        {speakerMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        </div>

        {/* Input Field */}
        {inputMode === 'chat' ? (
            <div className="p-4 flex items-end gap-3">
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-[24px] flex items-center px-4 py-2 border-2 border-transparent focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-all">
                <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                placeholder="Meddelande..."
                className="flex-1 bg-transparent outline-none text-[15px] text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
            </div>
            <button
                onClick={() => handleChatSend()}
                disabled={!chatInput.trim() || isWorking}
                className={clsx(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95",
                chatInput.trim() && !isWorking
                    ? "bg-[#C48B71] hover:bg-[#b57d63] text-white" // Terrakotta
                    : "bg-[#E8E5DC] text-[#7A7A7A]"
                )}
            >
                <Send className="w-5 h-5" />
            </button>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center p-6 gap-3">
            <button onClick={toggleRecording} className={clsx("w-20 h-20 rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all active:scale-95", isRecording ? "bg-[#C48B71] animate-pulse" : "bg-[#A9B8A2] hover:bg-[#98a791]")}>
            {isRecording ? <Square size={32} fill="currentColor" /> : <Mic size={32} />}
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {isRecording ? "Lyssnar..." : "Tryck för att börja tala"}
            </p>
            </div>
        )}
        </div>
        </div>
    );
};
