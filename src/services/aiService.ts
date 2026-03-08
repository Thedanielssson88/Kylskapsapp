const getServerUrl = () => localStorage.getItem('NANO_SERVER_URL') || 'http://192.168.50.185:8000';

export async function callAI(prompt: string, hiddenContext: string = ''): Promise<string> {
    const selectedModel = localStorage.getItem('NANO_MODEL') || 'gemini';
    const fullMessage = hiddenContext ? `${hiddenContext}\n\nAnvändarens inmatning:\n${prompt}` : prompt;

    if (selectedModel === 'claude-api') {
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
                max_tokens: 4096,
                messages: [{ role: 'user', content: fullMessage }]
            })
        });
        if (!response.ok) throw new Error(`Claude API Error (${response.status})`);
        const data = await response.json();
        return data.content[0].text;
    }

    if (selectedModel === 'gemini') {
        const geminiApiKey = localStorage.getItem('GEMINI_API_KEY');
        const geminiModelId = localStorage.getItem('NANO_GEMINI_MODEL_ID') || 'gemini-2.0-flash';
        if (!geminiApiKey) throw new Error('Gemini API-nyckel saknas');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModelId}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullMessage }] }],
                generationConfig: { temperature: 0.7 }
            })
        });
        if (!response.ok) throw new Error(`Gemini fel (${response.status})`);
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (selectedModel === 'openrouter') {
        const openRouterApiKey = localStorage.getItem('NANO_OPENROUTER_API_KEY') || localStorage.getItem('OPENROUTER_API_KEY');
        const openRouterModelId = localStorage.getItem('NANO_OPENROUTER_MODEL_ID') || 'deepseek/deepseek-chat';
        if (!openRouterApiKey) throw new Error('OpenRouter API-nyckel saknas');

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'Smart Skafferi'
            },
            body: JSON.stringify({ model: openRouterModelId, messages: [{ role: 'user', content: fullMessage }] })
        });
        if (!response.ok) throw new Error(`OpenRouter Error (${response.status})`);
        const data = await response.json();
        return data.choices[0].message.content;
    }

    throw new Error('Modell stöds ej eller är inte konfigurerad i aiService.');
}
