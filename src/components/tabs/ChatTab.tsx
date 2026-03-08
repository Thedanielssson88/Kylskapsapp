import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Volume2, VolumeX } from 'lucide-react';
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

export const ChatTab = ({ t, chatInput, setChatInput, attachedRecipe, setAttachedRecipe }: ChatTabProps) => {
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-64">
        {chatMessages.map(msg => (
            <div key={msg.id} className={clsx("flex flex-col", msg.role === 'user' ? 'items-end' : 'items-start')}>
            <div className={clsx("max-w-[85%] rounded-2xl p-4 text-sm shadow-sm overflow-hidden", msg.role === 'user' ? t.bubbleUser + ' rounded-br-none' : t.bubbleAgent + ' rounded-bl-none')}>
            {msg.role === 'agent' && msg.content === '...' ? 'AI tänker...' : renderMarkdown(msg.content)}
            </div>
            </div>
        ))}
        </div>

        <div className={clsx("absolute bottom-0 w-full border-t flex flex-col pb-24", t.bgInput, t.border)}>
        <div className="flex justify-center items-center gap-3 p-2 pt-3 border-b border-gray-200 dark:border-gray-800 relative">
        <button onClick={() => { setInputMode('chat'); stopListening(); }} className={clsx("px-8 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border", inputMode === 'chat' ? "bg-purple-600 border-purple-500 text-white" : clsx(t.bgAlt, t.border, t.textMuted))}>💬 Chatt</button>
        <button onClick={() => { setInputMode('voice'); startListening(); }} className={clsx("px-8 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border", inputMode === 'voice' ? "bg-green-600 border-green-500 text-white" : clsx(t.bgAlt, t.border, t.textMuted))}>🎙️ Tala</button>

        {/* NYTT: Ljud Av/På-knapp */}
        <button
        onClick={() => setSpeakerMode(!speakerMode)}
        className={clsx("absolute right-4 p-2 rounded-full transition-colors", speakerMode ? "text-green-500 hover:bg-green-500/10" : "text-gray-400 hover:bg-gray-500/10")}
        title={speakerMode ? "Ljud på" : "Ljud av"}
        >
        {speakerMode ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        </div>
        {inputMode === 'chat' ? (
            <div className="p-3 flex gap-2">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChatSend()} placeholder="Fråga om matlagning..." className={clsx("flex-1 px-4 py-3 rounded-xl outline-none border", t.bgInput, t.border, t.text)} />
            <button onClick={() => handleChatSend()} disabled={!chatInput.trim() || isWorking} className={clsx("p-3 rounded-xl shadow-md", t.btnPrimary)}>
            <Send className="w-5 h-5" />
            </button>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center p-4 gap-4">
            <button onClick={toggleRecording} className={clsx("w-16 h-16 rounded-full flex items-center justify-center text-white", isRecording ? "bg-red-500 animate-pulse" : "bg-green-600")}>
            {isRecording ? <Square size={28} fill="currentColor" /> : <Mic size={28} />}
            </button>
            </div>
        )}
        </div>
        </div>
    );
};
