import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Volume2, VolumeX, Sparkles, ChefHat, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { usePantry } from '../../context/PantryContext';
import { LocalAgentMessage, Recipe } from '../../types/pantry';
import { callAI } from '../../services/aiService';

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

// Scandi-anpassad Markdown (Snyggare textformatering)
const inlineMarkdown = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic text-inherit opacity-90">{part.slice(1, -1)}</em>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-[#EFEFEA] dark:bg-[#333333] text-[#4A5D4E] dark:text-[#8DAA94] px-1.5 py-0.5 rounded-md text-[13px] font-mono">{part.slice(1, -1)}</code>;
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
            const cls = level === 1
            ? 'font-bold text-xl mt-4 mb-2 text-[#2D2D2A] dark:text-white'
            : level === 2 ? 'font-bold text-lg mt-3 mb-1 text-[#2D2D2A] dark:text-[#EBEBEB]'
            : 'font-semibold text-base mt-2 text-[#2D2D2A] dark:text-[#EBEBEB]';
            elements.push(<div key={i} className={cls}>{inlineMarkdown(content)}</div>);
        } else if (/^[-*•]\s/.test(line)) {
            elements.push(
                <div key={i} className="flex gap-3 my-1.5 ml-1 items-start">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#4A5D4E] dark:bg-[#8DAA94] shrink-0 opacity-70" />
                <span className="leading-relaxed opacity-90">{inlineMarkdown(line.replace(/^[-*•]\s/, ''))}</span>
                </div>
            );
        } else if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^(\d+)\./)?.[1];
            elements.push(
                <div key={i} className="flex gap-3 my-2 items-start">
                <span className="shrink-0 text-[#4A5D4E] dark:text-[#8DAA94] font-bold text-sm bg-[#EAECE8] dark:bg-[#333333] w-6 h-6 flex items-center justify-center rounded-full mt-0.5">{num}</span>
                <span className="leading-relaxed opacity-90">{inlineMarkdown(line.replace(/^\d+\.\s/, ''))}</span>
                </div>
            );
        } else if (line.trim() === '') {
            elements.push(<div key={i} className="h-3" />);
        } else {
            elements.push(<div key={i} className="my-1 leading-relaxed opacity-90">{inlineMarkdown(line)}</div>);
        }
        i++;
    }
    return <div className="text-[15px]">{elements}</div>;
};

export const ChatTab = ({ t, chatInput, setChatInput, attachedRecipe, setAttachedRecipe, setIsModalOpen }: ChatTabProps) => {
    const { ingredients, isWorking } = usePantry();
    const [chatMessages, setChatMessages] = useState<LocalAgentMessage[]>([
        { id: '1', role: 'agent', content: 'Hej! Berätta vad du är sugen på, eller fota dina matvaror så hittar vi på något gott.', timestamp: Date.now() }
    ]);

    const [inputMode, setInputMode] = useState<'chat' | 'voice'>('chat');
    const [isRecording, setIsRecording] = useState(false);
    const [speakerMode, setSpeakerMode] = useState(() => localStorage.getItem('NANO_SPEAKER_MODE') !== 'false');

    // Denna ser till att menyn döljs när du klickar i textrutan!
    const [isFocused, setIsFocused] = useState(false);

    const isRecordingRef = useRef(false);
    const speechListenerRef = useRef<any>(null);
    const chatInputRef = useRef(chatInput);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { chatInputRef.current = chatInput; }, [chatInput]);
    const isLocalMode = localStorage.getItem('TRANSCRIPTION_MODE') === 'local';

    useEffect(() => {
        localStorage.setItem('NANO_SPEAKER_MODE', String(speakerMode));
        if (!speakerMode) {
            window.speechSynthesis?.cancel();
            TextToSpeech.stop().catch(() => {});
        }
    }, [speakerMode]);

    // Döljer huvudmenyn i NanoView när man klickar i fältet
    useEffect(() => {
        if (setIsModalOpen) setIsModalOpen(isFocused);
    }, [isFocused, setIsModalOpen]);

        // Automatisk scroll
        useEffect(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [chatMessages, isWorking]);

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
                } else { if (onEnded) onEnded(); }
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
            } else { return await stopRecording(); }
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
                if (speakerMode) speakText(aiResponse, () => { if (inputMode === 'voice') setTimeout(() => startListening(), 300); });
                else if (inputMode === 'voice') setTimeout(() => startListening(), 300);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Kunde inte nå servern.';
                setChatMessages(prev => [
                    ...prev.filter(m => m.id !== thinkingId),
                                { id: Date.now().toString(), role: 'agent', content: `Ett fel uppstod: ${errorMessage}`, timestamp: Date.now() }
                ]);
            } finally {
                if (setAttachedRecipe) setAttachedRecipe(null);
            }
        };

        const toggleRecording = async () => {
            window.speechSynthesis?.cancel();
            if (isRecordingRef.current) {
                const audioBlob = await stopListening();
                if (isLocalMode) {
                    if (chatInputRef.current.trim().length > 0) handleChatSend(chatInputRef.current);
                } else if (audioBlob) {
                    try {
                        const text = await transcribeBlobAI(audioBlob);
                        handleChatSend(text);
                    } catch(e) {}
                }
            } else { await startListening(); }
        };

        return (
            <div className="flex flex-col h-full relative">

            {/* Chatt-fönstret */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-56">
            {chatMessages.map((msg) => {
                const isUser = msg.role === 'user';

            return (
                <div key={msg.id} className={clsx("flex gap-3", isUser ? 'flex-row-reverse' : 'flex-row')}>

                {/* Diskret AI Avatar */}
                {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#EAECE8] dark:bg-[#2A2A2A] flex items-center justify-center flex-shrink-0 mt-1 relative">
                    <ChefHat className="w-4 h-4 text-[#4A5D4E] dark:text-[#8DAA94]" />
                    {msg.content === '...' && (
                        <Sparkles className="w-3 h-3 text-[#E6C27A] absolute -top-1 -right-1 animate-pulse" />
                    )}
                    </div>
                )}

                {/* Meddelande-bubbla (Här sätts de ljusa och gröna färgerna!) */}
                <div className={clsx(
                    "max-w-[85%] rounded-[1.5rem] p-4",
                    isUser
                    ? "bg-[#4A5D4E] dark:bg-[#5C7A63] text-white rounded-tr-sm shadow-sm"
                    : "bg-white dark:bg-[#1C1C1C] border border-[#E2E2DC]/60 dark:border-[#2E2E2E] rounded-tl-sm text-[#2D2D2A] dark:text-[#EBEBEB] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                )}>
                {msg.role === 'agent' && msg.content === '...' ? (
                    <div className="flex gap-1.5 items-center py-2 px-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A5D4E] dark:bg-[#8DAA94] opacity-40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A5D4E] dark:bg-[#8DAA94] opacity-60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A5D4E] dark:bg-[#8DAA94] opacity-80 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                ) : (
                    renderMarkdown(msg.content)
                )}
                </div>
                </div>
            );
            })}
            <div ref={messagesEndRef} />
            </div>

            {/* Svävande inmatningsfält - Scandi Glassmorphism */}
            <div className={clsx(
                "fixed left-0 right-0 z-20 transition-all duration-500 ease-out",
                isFocused ? "bottom-0" : "bottom-[72px]", // Svävar över bottenmenyn normalt, åker ner om man skriver
                "bg-gradient-to-t from-[#F7F7F5] via-[#F7F7F5]/90 to-transparent dark:from-[#121212] dark:via-[#121212]/90 pb-safe pt-8"
            )}>

            <div className="max-w-2xl mx-auto px-4 pb-4">

            <div className="flex justify-between items-center mb-3 px-2">
            <div className="flex gap-1 bg-[#EFEFEA]/80 dark:bg-[#262626]/80 backdrop-blur-md p-1 rounded-full border border-[#E2E2DC]/50 dark:border-[#333333]/50">
            <button
            onClick={() => { setInputMode('chat'); stopListening(); }}
            className={clsx("px-5 py-1.5 rounded-full text-[13px] font-medium transition-all", inputMode === 'chat' ? "bg-white dark:bg-[#333333] text-[#2D2D2A] dark:text-white shadow-sm" : "text-[#80807B] hover:text-[#2D2D2A]")}
            >
            Text
            </button>
            <button
            onClick={() => { setInputMode('voice'); startListening(); }}
            className={clsx("px-5 py-1.5 rounded-full text-[13px] font-medium transition-all", inputMode === 'voice' ? "bg-white dark:bg-[#333333] text-[#2D2D2A] dark:text-white shadow-sm" : "text-[#80807B] hover:text-[#2D2D2A]")}
            >
            Röst
            </button>
            </div>

            <button
            onClick={() => setSpeakerMode(!speakerMode)}
            className={clsx("p-2.5 rounded-full transition-all border", speakerMode ? "bg-white dark:bg-[#262626] border-[#E2E2DC] dark:border-[#333333] text-[#4A5D4E] dark:text-[#8DAA94] shadow-sm" : "bg-transparent border-transparent text-[#80807B]")}
            >
            {speakerMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            </div>

            {inputMode === 'chat' ? (
                <div className="flex items-end gap-2 bg-white dark:bg-[#1C1C1C] p-2 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#E2E2DC]/80 dark:border-[#2E2E2E] focus-within:border-[#4A5D4E]/40 transition-all">
                <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                placeholder="Vad är du sugen på idag?"
                className="flex-1 bg-transparent px-4 py-3 outline-none text-[15px] text-[#2D2D2A] dark:text-[#EBEBEB] placeholder:text-[#80807B]"
                />
                <button
                onClick={() => handleChatSend()}
                disabled={!chatInput.trim() || isWorking}
                className={clsx(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0",
                    chatInput.trim() && !isWorking
                    ? "bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white shadow-md active:scale-95"
                    : "bg-[#EFEFEA] dark:bg-[#262626] text-[#A3A3A3]"
                )}
                >
                {isWorking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                </button>
                </div>
            ) : (
                <div className="flex justify-center py-2">
                <button
                onClick={toggleRecording}
                className={clsx(
                    "w-20 h-20 rounded-full flex items-center justify-center text-white transition-all active:scale-95",
                    isRecording
                    ? "bg-[#D9534F] shadow-[0_0_30px_rgba(217,83,79,0.4)] animate-pulse"
                    : "bg-[#4A5D4E] shadow-xl hover:-translate-y-1"
                )}
                >
                {isRecording ? <Square size={28} fill="currentColor" /> : <Mic size={32} />}
                </button>
                </div>
            )}
            </div>
            </div>
            </div>
        );
};
