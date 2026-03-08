import React from 'react';
import { AgentMessage } from '../types';

export type LocalAgentMessage = AgentMessage & {
    sessionId?: string;
    imageUrls?: string[];
    inputTokens?: number;
    outputTokens?: number;
    isStreaming?: boolean;
};

const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
const INLINE_IMAGE_URL_REGEX = /(?<!\()(https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|svg)(\?\S*)?)/gi;

export function extractExternalImageUrls(text: string): { url: string; alt: string }[] {
    const imgs: { url: string; alt: string }[] = [];
    let match;
    MARKDOWN_IMAGE_REGEX.lastIndex = 0;
    while ((match = MARKDOWN_IMAGE_REGEX.exec(text)) !== null) imgs.push({ alt: match[1] || 'bild', url: match[2] });
    INLINE_IMAGE_URL_REGEX.lastIndex = 0;
    while ((match = INLINE_IMAGE_URL_REGEX.exec(text)) !== null) if (!imgs.some(i => i.url === match[0])) imgs.push({ alt: 'bild', url: match[0] });
    const mdLinkImg = /\[([^\]]+)\]\((https?:\/\/[^)]+\.(jpg|jpeg|png|gif|webp|svg)[^)]*)\)/gi;
    mdLinkImg.lastIndex = 0;
    while ((match = mdLinkImg.exec(text)) !== null) if (!imgs.some(i => i.url === match[2])) imgs.push({ alt: match[1], url: match[2] });
    return imgs;
}

const FILE_PATH_REGEX = /(`([^`]+\.[a-zA-Z0-9]+)`|(\/(workspace|home|tmp|var|etc)\/[\w./\-]+\.[a-zA-Z0-9]+))/g;

export function extractFilePaths(text: string): string[] {
    const paths: string[] = [];
    let match;
    FILE_PATH_REGEX.lastIndex = 0;
    while ((match = FILE_PATH_REGEX.exec(text)) !== null) {
        let p = match[2] || match[3];
        if (p) {
            if (!p.startsWith('/')) {
                if (!p.includes(' ')) p = '/workspace/group/' + p;
                else continue;
            }
            paths.push(p);
        }
    }
    return [...new Set(paths)];
}

export function toHostPath(p: string): string {
    if (p.startsWith('/home/deck/')) return p;
    return p.replace('/workspace/group/', '/home/deck/NanoClaw/groups/main/')
    .replace('/workspace/extra/', '/home/deck/NanoClaw/groups/main/uploads/');
}

export function getMediaType(p: string): 'image' | 'video' | 'audio' | 'html' | 'file' {
    const ext = p.split('.').pop()?.toLowerCase() || '';
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image';
    if (['mp4','webm','mov','avi','mkv'].includes(ext)) return 'video';
    if (['mp3','ogg','wav','m4a','flac','aac'].includes(ext)) return 'audio';
    if (['html','htm'].includes(ext)) return 'html';
    return 'file';
}

const ALL_PATH_REGEX = /`([^`]+\.[a-zA-Z0-9]+)`|((?:\/workspace\/|\/home\/deck\/)[^\s`'"<>\n]+\.[a-zA-Z0-9]+)/gi;

export function extractAllFilePaths(text: string): string[] {
    const paths: string[] = [];
    let match;
    ALL_PATH_REGEX.lastIndex = 0;
    while ((match = ALL_PATH_REGEX.exec(text)) !== null) {
        let p = (match[1] || match[2] || '').trim();
        if (p) {
            if (!p.startsWith('/')) {
                if (!p.includes(' ')) {
                    p = '/workspace/group/' + p;
                    paths.push(p);
                }
            } else {
                paths.push(p);
            }
        }
    }
    return [...new Set(paths)];
}

export const inlineMarkdown = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-black/30 px-1 rounded text-xs font-mono break-all">{part.slice(1, -1)}</code>;
        return part;
    });
};

export const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith('```')) {
            const lang = line.slice(3).trim();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            elements.push(
                <pre key={i} className="bg-black/40 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-green-300 border border-gray-700">
                {lang && <span className="text-gray-500 text-[10px] block mb-1">{lang}</span>}
                {codeLines.join('\n')}
                </pre>
            );
        } else if (/^#{1,3}\s/.test(line)) {
            const level = line.match(/^(#+)/)?.[1].length || 1;
            const content = line.replace(/^#+\s/, '');
            const cls = level === 1 ? 'font-bold text-base mt-2' : level === 2 ? 'font-bold mt-1' : 'font-semibold';
            elements.push(<p key={i} className={cls}>{inlineMarkdown(content)}</p>);
        } else if (/^[-*•]\s/.test(line)) {
            elements.push(<div key={i} className="flex gap-1.5 my-0.5"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" /><span>{inlineMarkdown(line.replace(/^[-*•]\s/, ''))}</span></div>);
        } else if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^(\d+)\./)?.[1];
            elements.push(<div key={i} className="flex gap-1.5 my-0.5"><span className="shrink-0 opacity-60 text-xs">{num}.</span><span>{inlineMarkdown(line.replace(/^\d+\.\s/, ''))}</span></div>);
        } else if (line === '') {
            elements.push(<div key={i} className="h-2" />);
        } else {
            elements.push(<p key={i} className="my-0.5">{inlineMarkdown(line)}</p>);
        }
        i++;
    }
    return <div className="text-sm leading-relaxed">{elements}</div>;
};

export const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
};
