import express from 'express';
import { whatsappService } from '../services/whatsapp/index.js';
import UsuarioWhatsApp from '../models/UsuarioWhatsApp.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Webhook publico (nao precisa auth)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    await whatsappService.processWebhook(req, res);
  } catch (err) {
    next(err);
  }
});

// Verificacao do webhook (GET)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp] Webhook verificado com sucesso');
    return res.status(200).send(challenge);
  }
  
  return res.status(403).json({ error: 'Token de verificacao invalido' });
});

router.use(protect);

router.get('/status', async (req, res, next) => {
  try {
    const configured = !!process.env.WHATSAPP_PROVIDER;
    res.json({
      configured,
      provider: process.env.WHATSAPP_PROVIDER || 'nao configurado',
      instance: process.env.WHATSAPP_INSTANCE || ''
    });
  } catch (err) { next(err); }
});

router.post('/testar', adminOnly, async (req, res, next) => {
  try {
    const { numero, mensagem } = req.body;
    if (!numero || !mensagem) {
      return res.status(400).json({ error: 'numero e mensagem sao obrigatorios' });
    }
    await whatsappService.sendMessage(numero, mensagem);
    res.json({ ok: true, message: 'Mensagem de teste enviada' });
  } catch (err) { next(err); }
});

router.post('/enviar-alerta', adminOnly, async (req, res, next) => {
  try {
    const { usuarioIds, mensagem } = req.body;
    if (!usuarioIds?.length || !mensagem) {
      return res.status(400).json({ error: 'usuarioIds e mensagem sao obrigatorios' });
    }
    const results = await whatsappService.sendProactiveAlert(req.user.empresa, usuarioIds, mensagem);
    res.json({ results });
  } catch (err) { next(err); }
});

export default router;