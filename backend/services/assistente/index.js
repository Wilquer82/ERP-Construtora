import MockAssistente from './MockAssistente.js';

let assistente = new MockAssistente();
let cacheOpenAI = null;
let cacheGemini = null;
let cacheOpenAIKey = null;
let cacheGeminiKey = null;

async function criarAssistente() {
  if (process.env.OPENAI_API_KEY) {
    const { default: OpenAIAssistente } = await import('./OpenAIAssistente.js');
    assistente = new OpenAIAssistente();
    console.log('[Assistente] Provável: OpenAI (gpt-4o-mini)');
  } else if (process.env.GEMINI_API_KEY) {
    const { default: GeminiAssistente } = await import('./GeminiAssistente.js');
    assistente = new GeminiAssistente();
    console.log('[Assistente] Provável: Gemini (gemini-1.5-flash)');
  } else {
    console.log('[Assistente] Modo: Mock (🔬 MODO DEMONSTRAÇÃO)');
  }
  return assistente;
}

async function criarAssistenteComChave(provider, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return assistente;
  }

  if (provider === 'openai') {
    if (cacheOpenAI && cacheOpenAIKey === apiKey) return cacheOpenAI;
    const { default: OpenAIAssistente } = await import('./OpenAIAssistente.js');
    cacheOpenAI = new OpenAIAssistente(apiKey);
    cacheOpenAIKey = apiKey;
    return cacheOpenAI;
  }

  if (provider === 'gemini') {
    if (cacheGemini && cacheGeminiKey === apiKey) return cacheGemini;
    const { default: GeminiAssistente } = await import('./GeminiAssistente.js');
    cacheGemini = new GeminiAssistente(apiKey);
    cacheGeminiKey = apiKey;
    return cacheGemini;
  }

  return assistente;
}

export { assistente, criarAssistente, criarAssistenteComChave };
export default assistente;
