import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.js';
import MensagemAssistente from '../models/MensagemAssistente.js';
import { assistente, criarAssistenteComChave } from '../services/assistente/index.js';
import { FERRAMENTAS_DISPONIVEIS } from '../services/assistente/LLMService.js';

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Limite de 20 consultas por hora atingido. Tente novamente mais tarde.' }
});

router.use(protect);
router.use(chatLimiter);

function extrairDemoFlag(instancia) {
  return instancia?.modoEmissao === 'demo';
}

router.post('/validar-chave', async (req, res, next) => {
  try {
    const { provider, apiKey } = req.body || {};
    if (!provider || !apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'Provider e apiKey sao obrigatorios' });
    }

    let valido = false;
    let erro = '';

    if (provider === 'openai') {
      const chave = apiKey.trim();
      if (!chave.startsWith('sk-')) {
        erro = 'Chave da OpenAI deve começar com "sk-"';
      } else if (chave.length < 20) {
        erro = 'Chave da OpenAI invalida (muito curta)';
      } else {
        valido = true;
      }
    } else if (provider === 'gemini') {
      const chave = apiKey.trim();
      if (!chave.startsWith('AI')) {
        erro = 'Chave do Gemini deve começar com "AI"';
      } else if (chave.length < 20) {
        erro = 'Chave do Gemini invalida (muito curta)';
      } else {
        valido = true;
      }
    } else {
      erro = 'Provider invalido. Use "openai" ou "gemini"';
    }

    return res.json({ valido, erro });
  } catch (err) {
    return next(err);
  }
});

router.post('/chat', async (req, res, next) => {
  try {
    const { mensagem, provider, apiKey } = req.body || {};
    if (typeof mensagem !== 'string' || mensagem.trim().length === 0) {
      return res.status(400).json({ error: 'Mensagem e obrigatoria' });
    }
    if (mensagem.trim().length > 2000) {
      return res.status(400).json({ error: 'Mensagem muito longa (max 2000 caracteres)' });
    }

    const instancia = (provider && apiKey)
      ? await criarAssistenteComChave(provider, apiKey)
      : assistente;

    const historico = await MensagemAssistente.find({
      empresa: req.user.empresa,
      usuario: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('pergunta resposta createdAt')
      .lean();

    const historicoFormatado = historico.reverse().flatMap((msg) => [
      { role: 'user', content: msg.pergunta },
      { role: 'assistant', content: msg.resposta.replace(/^🔬 MODO DEMONSTRAÇÃO\n\n/, '') }
    ]);

    const resultado = await instancia.conversar({
      historico: historicoFormatado,
      mensagemAtual: mensagem,
      ferramentasDisponiveis: FERRAMENTAS_DISPONIVEIS
    });

    const isDemo = extrairDemoFlag(instancia);

    await MensagemAssistente.create({
      empresa: req.user.empresa,
      usuario: req.user.id,
      pergunta: mensagem,
      resposta: resultado.resposta,
      ferramentasUsadas: resultado.ferramentasUsadas || [],
      fontes: resultado.fontes || [],
      acaoSugerida: resultado.acaoSugerida || ''
    });

    return res.json({
      resposta: resultado.resposta,
      fontes: resultado.fontes || [],
      acaoSugerida: resultado.acaoSugerida || '',
      demo: isDemo
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/historico', async (req, res, next) => {
  try {
    const { limite = 20 } = req.query;
    const mensagens = await MensagemAssistente.find({
      empresa: req.user.empresa,
      usuario: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(Number(limite))
      .select('pergunta resposta fontes acaoSugerida createdAt')
      .lean();

    res.json(mensagens.reverse());
  } catch (err) {
    return next(err);
  }
});

router.get('/status', (req, res) => {
  const provedor = process.env.OPENAI_API_KEY
    ? 'OpenAI (gpt-4o-mini)'
    : process.env.GEMINI_API_KEY
      ? 'Gemini (gemini-1.5-flash)'
      : 'MockAssistente (demo)';
  const demo = !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY;

  res.json({
    provedor,
    demo,
    limite: '20 consultas/hora',
    chaveConfigurada: !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY)
  });
});

export default router;
