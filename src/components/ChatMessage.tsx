import React, { memo } from 'react';
import { clsx } from 'clsx';
import { Download } from 'lucide-react';
import {
    LocalAgentMessage,
    extractAllFilePaths,
    extractExternalImageUrls,
    extractFilePaths,
    formatTime,
        getMediaType,
        renderMarkdown,
        toHostPath
} from '../utils/chatHelpers';

export interface ChatMessageProps {
    msg: LocalAgentMessage;
    serverUrl: string;
    mediaCacheState: Record<string, string>;
    onLongPressStart: (msgId: string, e: React.TouchEvent | React.MouseEvent) => void;
    onLongPressEnd: () => void;
    onLightboxOpen: (url: string) => void;
    onDownload: (path: string) => void;
    onHtmlOpen: (content: string, fileName: string) => void;
    onFetchMedia: (serverUrl: string, path: string) => void;
    onFetchHtmlFile: (path: string) => void;
}

export const ChatMessage = memo(({
    msg,
    serverUrl,
    mediaCacheState,
    onLongPressStart,
    onLongPressEnd,
    onLightboxOpen,
    onDownload,
    onHtmlOpen,
    onFetchMedia,
    onFetchHtmlFile
}: ChatMessageProps) => {

    const filePaths = (msg.role === 'agent' && !msg.isStreaming) ? extractFilePaths(msg.content) : [];
    const allServerPaths = (msg.role === 'agent' && !msg.isStreaming) ? extractAllFilePaths(msg.content) : [];
    const externalImages = (msg.role === 'agent' && !msg.isStreaming) ? extractExternalImageUrls(msg.content) : [];
    const isUser = msg.role === 'user';
    const toMediaUrl = (p: string) => `${serverUrl}/api/files?path=${encodeURIComponent(toHostPath(p))}`;

    const htmlFiles = allServerPaths.filter(p => getMediaType(p) === 'html');

    return (
        <div className={clsx("flex flex-col gap-0.5", isUser ? 'items-end' : 'items-start', msg.isStreaming && "opacity-80 animate-pulse")} onTouchStart={e => onLongPressStart(msg.id, e)} onTouchEnd={onLongPressEnd} onTouchMove={onLongPressEnd} onMouseDown={e => onLongPressStart(msg.id, e)} onMouseUp={onLongPressEnd} onMouseLeave={onLongPressEnd}>
        <div className={clsx("max-w-[80%] rounded-2xl p-4 shadow-sm select-none", isUser ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700')}>

        {/* Bilder */}
        {msg.imageUrls && msg.imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
            {msg.imageUrls.map((url, i) => ( <img key={i} src={url} alt="Bifogad bild" onClick={() => onLightboxOpen(url)} className="max-h-48 max-w-full rounded-xl object-contain bg-black/20 cursor-pointer active:opacity-80" /> ))}
            </div>
        )}

        {/* Externa bilder */}
        {externalImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
            {externalImages.map((img, i) => ( <img key={i} src={img.url} alt={img.alt} onClick={() => onLightboxOpen(img.url)} className="max-h-64 max-w-full rounded-xl object-contain bg-black/20 cursor-pointer active:opacity-80" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> ))}
            </div>
        )}

        {/* Media / Filer */}
        {allServerPaths.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
            {allServerPaths.map((p, i) => {
                const fileUrl = toMediaUrl(p);
                const type = getMediaType(p);
                const name = p.split('/').pop() || p;
                const cachedUrl = mediaCacheState[p];

                if (type === 'html') return null;

                if (!cachedUrl) onFetchMedia(fileUrl, p);

                return (
                    <div key={i} className="flex flex-col gap-1">
                    {type === 'image' && (
                        cachedUrl && cachedUrl !== 'loading' && cachedUrl !== 'error'
                    ? <img src={cachedUrl} alt={name} onClick={() => onLightboxOpen(cachedUrl)} className="max-h-64 max-w-full rounded-xl object-contain bg-black/20 cursor-pointer active:opacity-80" />
                    : cachedUrl === 'error'
                    ? <div className="text-[11px] text-red-400 px-3 py-2 bg-red-900/20 rounded-xl">Kunde inte ladda {name}</div>
                    : <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2 text-xs text-gray-400">
                    <span className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin shrink-0" /> Laddar {name}...
                    </div>
                    )}
                    {type === 'video' && (
                        cachedUrl && cachedUrl !== 'loading' && cachedUrl !== 'error'
                    ? <video src={cachedUrl} controls className="max-h-64 max-w-full rounded-xl bg-black" />
                    : cachedUrl === 'error'
                    ? <div className="text-[11px] text-red-400 px-3 py-2 bg-red-900/20 rounded-xl">Kunde inte ladda {name}</div>
                    : <div className="text-xs text-gray-400 px-3 py-2 bg-black/20 rounded-xl">Laddar video...</div>
                    )}
                    {type === 'audio' && (
                        cachedUrl && cachedUrl !== 'loading' && cachedUrl !== 'error'
                        ? <div className="bg-black/30 rounded-xl p-3"><p className="text-[11px] text-gray-400 mb-1 truncate">{name}</p><audio src={cachedUrl} controls className="w-full" /></div>
                        : cachedUrl === 'error'
                        ? <div className="text-[11px] text-red-400 px-3 py-2 bg-red-900/20 rounded-xl">Kunde inte ladda ljud</div>
                        : <div className="text-xs text-gray-400 px-3 py-2 bg-black/20 rounded-xl">Laddar ljud...</div>
                    )}
                    <button onClick={() => onDownload(p)} className="flex items-center gap-2 bg-purple-700/40 hover:bg-purple-600/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs text-purple-200 transition-colors mt-1">
                    <Download className="w-3 h-3 shrink-0" /> <span className="font-mono truncate">{name}</span>
                    </button>
                    </div>
                );
            })}
            </div>
        )}

        {/* Själva textinnehållet */}
        {isUser ? (
            <div className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</div>
        ) : (
            <div className="break-words overflow-hidden">
            {msg.content.includes('<!DOCTYPE html>') ? (
                !msg.isStreaming ? (
                    <div className="flex flex-col gap-3">
                    <p className="text-sm text-gray-300">Jag har genererat en interaktiv rapport baserat på din förfrågan.</p>
                    <button
                    onClick={() => {
                        const htmlMatch = msg.content.match(/```html\n([\s\S]*?)```/) || msg.content.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i);
                        if (htmlMatch) {
                            onHtmlOpen(htmlMatch[1] || htmlMatch[0], 'Interaktiv_Rapport.html');
                        }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                    <span>📄</span> Öppna Rapport i Helskärm
                    </button>
                    </div>
                ) : (
                    <div className="text-sm text-gray-400 italic">Bygger HTML-rapport...</div>
                )
            ) : (
                renderMarkdown(msg.content)
            )}
            </div>
        )}

        {/* HTML-rapporter från disk */}
        {!isUser && !msg.isStreaming && htmlFiles.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 border-t border-gray-700 pt-3">
            <p className="text-[11px] text-gray-400 mb-1 uppercase tracking-wide">Tillgängliga Rapporter:</p>
            {htmlFiles.map((fp, i) => {
                const fileName = fp.split('/').pop() || 'Rapport';
            return (
                <button
                key={`html-${i}`}
                onClick={() => onFetchHtmlFile(fp)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center gap-2 text-sm w-full"
                >
                <span className="shrink-0">📄</span>
                <span className="truncate text-left">Öppna {fileName} i Helskärm</span>
                </button>
            );
            })}
            </div>
        )}

        {/* Ospecifika filer / Nedladdningar */}
        {!isUser && !msg.isStreaming && filePaths.filter(fp => !allServerPaths.includes(fp)).length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
            {filePaths.filter(fp => !allServerPaths.includes(fp)).map((fp, i) => (
                <button key={i} onClick={() => onDownload(fp)} className="flex items-center gap-2 bg-purple-700/40 hover:bg-purple-600/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs text-purple-200 transition-colors">
                <Download className="w-3 h-3 shrink-0" /> <span className="font-mono truncate">{fp.split('/').pop()}</span> <span className="text-purple-400 truncate text-[10px]">{fp}</span>
                </button>
            ))}
            </div>
        )}
        </div>

        {/* Tid & Tokens */}
        <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] text-gray-600">{formatTime(msg.timestamp)}</span>
        {!isUser && (msg.inputTokens || msg.outputTokens) && !msg.isStreaming && (
            <span className="text-[10px] text-gray-600">
            {msg.inputTokens ? `↑${msg.inputTokens}` : ''}{msg.inputTokens && msg.outputTokens ? ' ' : ''}{msg.outputTokens ? `↓${msg.outputTokens}` : ''} tok
            </span>
        )}
        </div>
        </div>
    );
});
